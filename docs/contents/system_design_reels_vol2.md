# System Design Reels — Volume 2

## 1. How Consistent Hashing Keeps the Internet From Falling Apart

Add one server to your cache cluster and suddenly 90% of your cached data becomes unreachable. This single problem is why consistent hashing exists, and it quietly runs half the internet.

Here's the naive setup. You have N cache servers and you pick one with `hash(key) % N`. Works great, until N changes. Add or remove one server and the modulo shifts for almost every key. Nearly all your data now maps to the wrong server, a total cache miss storm that stampedes your database. At scale that's an outage.

Consistent hashing fixes this. Imagine a ring, hash values from 0 to the max wrapped into a circle. Each server is placed at several points on the ring. To find a key's server, you hash the key and walk clockwise to the next server. That's it.

Now the magic. When you add a server, only the keys between it and the previous point move. When one dies, only its keys shift to the next server clockwise. Everything else stays put. Instead of remapping almost everything, you remap roughly 1 over N of the data.

Those multiple points per server are virtual nodes, they spread each server's load evenly so no single machine gets a hot slice of the ring.

This is how DynamoDB, Cassandra, and CDNs decide where data lives. Takeaway, when your cluster size changes constantly, don't hash to a server, hash to a position, and let the ring absorb the churn.

## 2. How Rate Limiters Stop a Million Requests Without Blocking You

A bad actor sends a million requests a second at your API. A good user sends three. Your rate limiter has to crush one and wave the other through, in microseconds, across dozens of servers. Here's how it actually works.

The classic algorithm is the token bucket. Picture a bucket that refills with tokens at a fixed rate, say 10 per second. Every request takes one token. Tokens available, request allowed. Bucket empty, request rejected. The bucket has a max size, so it allows short bursts, a user who was quiet can spend saved-up tokens all at once, which feels natural.

Compare that to a fixed window counter, count requests per minute, reset at the top of each minute. Simple, but it has an ugly edge, someone can send a full batch at 11:59:59 and another full batch at 12:00:00, double your limit in one second, because the window reset. The sliding window log and sliding window counter fix this by smoothing the boundary.

Now the distributed catch. If you have 20 servers, each can't keep its own counter or a user gets 20x the limit. So the counter lives in a shared store, usually Redis, incremented atomically. One source of truth, checked on every request.

Takeaway, rate limiting isn't just blocking traffic. It's choosing the algorithm whose burst behavior and boundary math match how your users actually behave.

## 3. How Databases Survive Being Split Into a Thousand Pieces

Your database hits a wall, one machine can't hold the data or the load. So you split it across many machines. Sounds simple, until you realize sharding breaks half the things you took for granted. Here's the real trade.

Sharding means partitioning your data by a shard key. Pick the key well and it's beautiful, pick it wrong and you rebuild everything later.

Option one, hash-based sharding. Hash the key, mod it across shards, data spreads evenly and no shard runs hot. But range queries die, give me all users created last week now hits every shard, because related rows are scattered everywhere.

Option two, range-based sharding. Users A to F on shard one, G to M on shard two. Range queries are fast and local. But you get hotspots, if everyone signs up with recent timestamps, one shard eats all the writes while others sit idle.

Then the real pain. Cross-shard joins, a query that needs data from multiple shards is slow and complex. Cross-shard transactions, keeping two shards consistent needs distributed transactions, which are expensive and fragile. And rebalancing, when a shard fills up, moving data without downtime is genuinely hard, which is exactly why consistent hashing matters here.

Takeaway, the shard key is the most important decision in the whole system. It decides your query speed, your hotspots, and your future pain. Choose it around how you'll actually read the data.

## 4. How YouTube Serves One Video in Every Quality at Once

You upload one video. Somehow YouTube plays it smoothly on a cracked phone on 3G and on a 4K TV on fiber, adjusting mid-stream without buffering. That single uploaded file became dozens of versions. Here's the pipeline.

The moment you upload, the video enters a transcoding pipeline. The raw file gets split into small chunks, seconds each, and those chunks are encoded in parallel across a huge fleet of machines into many resolutions and bitrates, 144p up to 4K, in several codecs. Parallelism is why a long video processes in minutes, not hours.

Now playback. This is adaptive bitrate streaming, using a protocol like DASH or HLS. Your player doesn't download the whole video. It grabs a manifest, a menu listing every quality and where each chunk lives. The player starts low to begin fast, measures your real download speed, and requests the next few seconds at the highest quality your connection can sustain. Network drops, it silently steps down. Network recovers, it steps back up. That's the quality shifting you've seen.

Every chunk is served from a CDN edge cache physically near you, often inside your own ISP, so bytes travel a short distance. Popular videos live pre-warmed at the edge.

Takeaway, streaming isn't sending a file. It's pre-computing every version, chopping it into swappable pieces, and letting the player make a fresh bandwidth decision every few seconds.

## 5. How Payment Systems Never Charge You Twice

You tap pay, the network hiccups, the app retries automatically. You just sent the request twice. So why were you only charged once? The answer is one word engineers obsess over, idempotency, and it's what stands between you and a double charge.

Here's the danger. In a distributed system, you often can't tell the difference between a request that failed and a request that succeeded but whose response got lost. So clients retry. Without protection, a retry means a second charge, a duplicate order, a double email.

An idempotent operation is one you can run many times and the result is the same as running it once. The trick is the idempotency key. Before charging, the client generates a unique key for that specific payment attempt and sends it with the request. The server checks, have I already processed this key? If no, process the payment and store the result against the key. If yes, don't charge again, just return the saved result of the first attempt.

Now the retry is safe. Same key, same guaranteed outcome, one charge. Stripe's API is built exactly around this, you pass an idempotency key and retry fearlessly.

This ties into exactly-once processing, which is genuinely hard in distributed systems, so the honest pattern is at-least-once delivery plus idempotent handlers, deliver possibly twice, but make duplicates harmless.

Takeaway, in an unreliable network you can't stop retries, so you design so retries can never hurt you.

## 6. How Search Autocomplete Predicts You in Milliseconds

You type two letters and a search box instantly suggests ten things you might mean, ranked by popularity, out of billions of possible strings, before you've finished blinking. That's not luck, it's a specific data structure doing a specific job. Here's the mechanism.

The structure is a trie, a prefix tree. Each node is a character, and paths from the root spell out words. Everything starting with c-a shares the same path down to that point, so once you've walked to the c-a node, every word underneath it is a candidate. Finding all completions for a prefix becomes walking to that node and reading its subtree, not scanning a dictionary.

But raw completions aren't enough, you want the best ones. So at each node you precompute and cache the top few most popular queries that pass through it, ranked by search frequency. Now a keystroke is, walk to the node, return its cached top list. Microseconds.

At scale you can't hold one giant trie on one machine, so it's sharded, often by prefix, and the hot popular branches are cached aggressively in memory. Suggestions update from real query logs on a delay, trends fold in over time, they don't need to be instant.

Takeaway, autocomplete feels like prediction but it's really precomputation, the right tree plus cached rankings turns an impossible live search into a cheap lookup.

## 7. How Load Balancers Decide Who Handles Your Request

Every request you send to a big site hits a load balancer first, a traffic cop deciding which of thousands of servers gets your work. Pick wrong and one server melts while others nap. The algorithm it uses is a quietly huge decision. Here's the spread.

Simplest is round robin, server one, two, three, repeat. Even and easy, but it assumes every request costs the same and every server is equally strong. Often false, one heavy request can pin a server while it still gets its fair share of new ones.

Smarter is least connections, send the next request to whichever server has the fewest active connections right now. This naturally routes around a server that's bogged down on slow requests. Great when request durations vary a lot.

Then there's consistent hashing based routing, route by a key like user ID so the same user keeps landing on the same server. That's gold when the server caches that user's data, you keep the cache warm instead of cold-missing on a random box every time.

Underneath sits health checking. The balancer constantly pings servers and instantly pulls a dead or slow one out of rotation, so your request never gets routed into a black hole. That's the real availability win.

And it works at layers, L4 balances on IP and port, fast and dumb, L7 reads the actual HTTP request and can route by URL or header, smarter and slightly slower.

Takeaway, the best balancing algorithm depends on whether your requests are uniform, whether they vary wildly, or whether keeping a user pinned for cache locality is worth more than perfect evenness.

## 8. How Distributed Systems Agree on Anything Without a Boss

Five servers, no leader, and they all have to agree on a single value even if some crash or messages get lost. This is the hardest problem in distributed systems, and cracking it is what makes databases trustworthy. It's called consensus. Here's the idea.

The problem, in a cluster there's no single source of truth by default. Who's the leader? What's the latest committed value? If nodes just guess, you get split brain, two nodes both think they're in charge, and your data forks into two conflicting histories. Catastrophe.

Consensus algorithms like Raft solve this. Raft makes it understandable with a clear model. Nodes elect a leader by majority vote, a candidate that gets votes from more than half the cluster wins. Because a majority can only back one winner, you can't have two leaders at once. That quorum, more than half, is the whole trick.

All writes go through the leader, which appends them to a replicated log and only commits once a majority of nodes have stored the entry. If the leader dies, the remaining nodes detect silence, hold a new election, and a node with an up-to-date log takes over. The committed history survives because a majority already had it.

This is what powers etcd, which coordinates Kubernetes, and systems like Consul. When your cluster reliably knows who's in charge and what's committed, Raft is usually why.

Takeaway, you can't trust any single node, so you trust the majority, no decision is real until more than half agree, and that quorum makes split brain mathematically impossible.

## 9. How Twitter Handles a Tweet That Goes Viral in Seconds

A normal account tweets, easy. A celebrity tweets and it's liked a million times in minutes, a sudden firehose aimed at a single piece of data. Most systems would buckle. Here's how you design for the spike instead of praying it doesn't come.

The core issue is a hotspot, one tweet, one counter, millions of concurrent writes to that exact row. Every like tries to increment the same value at the same instant. A single database row can't take that, it becomes a lock-contention nightmare and everything queues behind it.

First defense, don't write to the database on every like. Buffer them. Likes flow into a fast in-memory layer or a queue, and you increment the durable count in batches, thousands of likes become one write. The user sees an instant response from the fast layer while the real number settles asynchronously.

Second, split the counter. Instead of one row, keep many sub-counters, or shards, for the same tweet across different nodes. Each like hits a random shard, spreading the write load. The displayed total is the sum of the shards, computed on read. No single row is the bottleneck anymore.

Third, the read side. That viral tweet is read far more than it's written, so it's cached hard at the edge and served from memory, never hitting the database for display.

And the count you see is eventually consistent, it might lag reality by a second. For a like counter, that's completely fine, and accepting it is what lets the system stay up.

Takeaway, when writes concentrate on one hot key, you survive by spreading them, buffering them, and accepting that exact-to-the-millisecond isn't worth an outage.

## 10. How Your Phone Finds a Website in Under 50 Milliseconds

You type a domain and a page loads from a server on another continent almost instantly. But computers don't speak in names, they speak in numbers, and the system that translates one to the other is a global, layered lookup running billions of times a second. This is DNS, and it's a masterclass in caching.

When you request a domain, your machine needs its IP address. It asks a resolver, usually run by your ISP or a service like Cloudflare. The resolver's job is to find the answer, and it does a hierarchical walk.

It starts near the top, root servers point it to the servers responsible for the top level domain, like dot com. Those point it to the authoritative servers for the specific domain, which finally return the real IP. A few hops, each narrowing down, like navigating a filing system from cabinet to drawer to folder.

Doing that full walk every time would be slow, so the entire system is drenched in caching. The answer comes with a TTL, a time to live. Your browser caches it, your operating system caches it, the resolver caches it. For that TTL window, the same lookup is answered instantly from memory, no walk needed. The vast majority of DNS queries never travel far at all.

This caching is also why a DNS change isn't instant, old cached answers linger until their TTL expires, that's propagation delay.

Takeaway, DNS scales to the entire planet not by being fast at the lookup, but by making sure it almost never has to do the full lookup, layered caching with expiry is the real engine.

## 11. How Messaging Queues Save Systems From Their Own Traffic

Your service gets a sudden 10x traffic spike, but instead of crashing, it just gets a little slower and catches up later. The thing absorbing that shock is a message queue, and understanding why it works is a core systems skill. Here's the mechanism.

The problem is tight coupling. If service A calls service B directly and synchronously, A is only as fast and as available as B. B slows down, A backs up. B goes offline, A starts failing too. The failure spreads.

A message queue breaks that link. Instead of calling B directly, A drops a message into a queue and immediately moves on. B pulls messages from the queue and processes them at its own pace. Now A and B are decoupled, they don't have to be up at the same time or run at the same speed.

This unlocks three big wins. Buffering, during a traffic spike, messages pile safely in the queue instead of overwhelming B, and B drains them when it can, spiky input becomes smooth processing. Resilience, if B crashes, messages wait in the queue instead of vanishing, and get processed once B recovers, nothing is lost. Scaling, if the queue grows too fast, you just add more consumers to pull in parallel.

The trade is that you shift from synchronous to asynchronous, the work happens eventually, not instantly, so you design for that, plus you handle duplicates with idempotency since most queues deliver at least once.

Takeaway, a queue turns a fragile direct call into a shock absorber, decoupling producers from consumers so a spike or a crash on one side never becomes a failure on the other.

## 12. How Big Systems Read Fast and Write Fast at the Same Time

A single database that's great at heavy writes is usually bad at heavy reads, and tuning for one hurts the other. Giant systems escape this trap with a pattern that feels like cheating, they split reading and writing into two different paths entirely. It's called CQRS. Here's the logic.

Normally one model does everything, the same tables and schema handle creating data and querying it. But those jobs want opposite things. Writes want normalized data, no duplication, easy to keep correct. Reads want denormalized data, everything precomputed and joined already, so a query is a simple fast fetch. You can't fully optimize for both in one model.

CQRS, Command Query Responsibility Segregation, splits them. The command side handles writes, optimized for correctness and consistency. The query side handles reads, using separate read models shaped exactly for the queries your app makes, often precomputed and stored denormalized.

When a write happens, the change propagates to the read models, frequently asynchronously. That means the read side can be eventually consistent, briefly behind the write side. For most features, a page showing data a second stale is totally acceptable, and in exchange reads become extremely fast and independently scalable.

This pairs naturally with event sourcing, where instead of storing just the current state, you store the full stream of events that led to it, and rebuild any read model you want from that history.

Takeaway, reads and writes have opposite needs, so past a certain scale you stop forcing one model to do both, split the paths, shape each for its job, and accept a little staleness on the read side as the price of speed.
