# System Design Reels

## 1. How GTA V Streams a City You Never See Loaded

**Difficulty:** Intermediate

**Hook (first 3 sec):** Rockstar built a 49 sq km city that never fully exists in memory. Here's the trick.

**Script (60–75s):**

HOOK: GTA V's map is 49 square kilometers, but your console only has a few GB of RAM. So how do you walk into a city that can't fit in memory?

The answer is streaming. The world is chopped into a spatial grid of cells. As the player moves, the engine loads only cells inside a radius around you and evicts everything behind you. Think of it as a sliding window over a huge dataset, LRU eviction at planet scale.

But loading a full building the instant it's needed causes hitches. So Rockstar uses LODs, Levels of Detail. Far away, that skyscraper is a 200-triangle blob. As you approach, the engine swaps in progressively higher-detail meshes and textures, prefetched asynchronously on background threads so the main render thread never stalls.

The real magic is prediction. The streamer looks at your velocity and heading and preloads what you're ABOUT to see, not just what you see now. Fast car? Wider prefetch radius. This is the same idea as CPU cache prefetching and CDN edge caching, just applied to geometry.

TAKEAWAY: Any system serving more data than fits in memory is really solving one problem, what to keep close and what to predict next. GTA just makes it beautiful.

---



## 2. Why Redis Is Blazing Fast With ONE Thread

**Difficulty:** Intermediate

**Hook (first 3 sec):** Redis handles 100k+ ops per second on a single thread. Your multithreaded service can't. Why?

**Script (60–75s):**

HOOK: Everyone assumes more threads means more speed. Redis is single-threaded for command execution and destroys multithreaded databases. Here's why that's not a paradox.

Threads aren't free. Every time you share data across threads you need locks, and locks cause contention, context switches, and cache-line bouncing between CPU cores. That coordination overhead can eat more time than the actual work.

Redis sidesteps all of it. One thread, no locks, no race conditions on the data. Every command runs to completion atomically. That's WHY Redis operations are atomic for free, there's literally no one else touching the data.

So how does one thread serve thousands of clients? I/O multiplexing. Using epoll on Linux, a single thread watches thousands of sockets and only wakes up for the ones with data ready. The thread is never blocked waiting on the network, it's always doing useful work.

And because everything lives in RAM with no disk seeks in the hot path, each operation is microseconds. A single thread doing microsecond work with zero coordination overhead beats many threads fighting over locks.

NOTE: Redis 6+ does use threads for network I/O, but command execution stays single-threaded on purpose.

TAKEAWAY: Concurrency isn't parallelism. Sometimes the fastest design is the one that never has to coordinate.

---



## 3. How Instagram Serves Your Feed to 2 Billion People

**Difficulty:** Advanced

**Hook (first 3 sec):** When you open Instagram, it can't compute your feed live. So when does it actually happen?

**Script (60–75s):**

HOOK: 2 billion users, each with a personalized feed. If Instagram built your feed the moment you opened the app, the servers would melt. So they cheat with a decades-old trick.

The core question is fan-out. When someone you follow posts, how does it reach your feed? Two strategies.

Fan-out on write, push. The moment a creator posts, the system writes that post ID into the feed cache of every follower. Reading your feed is then instant, just fetch your precomputed list. Fast reads, but a celebrity with 400 million followers triggers 400 million writes per post. That's a write storm.

Fan-out on read, pull. Compute the feed when you open the app by pulling recent posts from everyone you follow. Cheap writes, but slow, expensive reads.

Instagram uses a hybrid. Normal accounts, push to followers' caches. Mega-celebrities, don't fan out, their posts get merged in at read time. You get the best of both.

Underneath, the feed cache lives in Redis or Memcached, posts in sharded databases, media on a CDN close to you. Ranking, likelihood you'll engage, is applied on read over that candidate set.

TAKEAWAY: There's no single right answer between precompute and compute-on-demand. The senior move is knowing when to use each, sometimes in the same system.

---



## 4. The Reason Your Database Falls Over at Midnight

**Difficulty:** Intermediate

**Hook (first 3 sec):** One expired cache key can take down your entire database. It's called the thundering herd.

**Script (60–75s):**

HOOK: It's 3am. Your database is on fire. Nothing changed in your code. The culprit? A single cache key expired at the worst possible moment.

This is the thundering herd, also called a cache stampede. Here's how it kills you.

Say 10,000 requests per second all read the same hot value from cache, a homepage, a trending post. That key has a TTL and it expires. Now the very next request finds a cache miss and goes to the database to rebuild it. But so does the next. And the next. All 10,000 requests in that window see a miss simultaneously and stampede the database with the same expensive query at once. The DB chokes, latency spikes, and now MORE requests pile up. Cascading failure.

Three defenses. First, locking, the first request to miss grabs a lock and rebuilds the cache while everyone else briefly waits or serves stale. Only one query hits the DB. Second, early recomputation, refresh the key in the background BEFORE it expires, so it never actually goes cold. Third, jittered TTLs, add randomness so thousands of keys don't all expire on the same tick.

TAKEAWAY: In distributed systems, correlated behavior is the enemy. When everything synchronizes, it synchronizes into a failure.

---



## 5. How Uber Finds a Driver Near You in Milliseconds

**Difficulty:** Advanced

**Hook (first 3 sec):** Uber can't scan every driver on Earth to find one near you. Geospatial indexing is the secret.

**Script (60–75s):**

HOOK: You tap request. In under a second Uber finds the closest drivers out of millions moving in real time. Scanning them all would take forever. Here's the data structure that makes it instant.

The naive approach, calculate the distance from you to every driver, is O(n) across millions, and their positions change every few seconds. Impossible at scale.

The fix is spatial indexing. Uber built H3, a system that divides the entire globe into hexagonal cells. Every driver's GPS location maps to a hexagon ID. Now finding nearby drivers isn't a distance calculation over everyone, it's a lookup, which hexagon am I in, and what are the neighboring hexagons? You only check drivers in those few cells.

Why hexagons instead of squares? Every hexagon neighbor is the same distance away from the center. With square grids, diagonal neighbors are farther than edge neighbors, which distorts distance. Hexagons give uniform adjacency, cleaner nearest-neighbor queries.

Driver locations stream into an in-memory index keyed by cell, updated continuously. Matching becomes reading a handful of buckets instead of scanning a continent.

TAKEAWAY: When brute force is O(n) over a moving dataset, the answer is almost always a smarter index. Turn a search problem into a lookup problem.

---



## 6. How WhatsApp Ran 900 Million Users on 50 Engineers

**Difficulty:** Advanced

**Hook (first 3 sec):** 50 engineers. 900 million users. The tech everyone told them not to use made it possible.

**Script (60–75s):**

HOOK: At acquisition, WhatsApp served roughly 900 million users with an engineering team you could fit in a small room. Their secret weapon was a language most companies avoid, Erlang.

Chat is a brutal systems problem, tens of millions of persistent, mostly idle connections. Every online user holds an open socket waiting for messages. Traditional thread-per-connection models die here, threads are heavy, and idle connections waste enormous memory.

Erlang runs on the BEAM virtual machine, built for exactly this. It uses lightweight processes, not OS threads. Each is a few kilobytes, and a single server can hold millions of them. Each connection gets its own tiny process. If one crashes, it dies alone and a supervisor restarts it, the famous let it crash philosophy. No shared memory, so no lock contention.

They tuned a single FreeBSD server to hold over two million concurrent connections. The message routing was mostly moving small payloads between processes, something BEAM does incredibly efficiently.

TAKEAWAY: Match the tool to the problem's true shape. WhatsApp's problem was massive concurrency with isolation, and they picked the one runtime designed for precisely that, instead of forcing a popular stack to do a job it hates.

---



## 7. Why Kafka Can Handle Trillions of Messages a Day

**Difficulty:** Advanced

**Hook (first 3 sec):** Kafka writes to disk and is FASTER than systems that write to memory. That shouldn't be possible.

**Script (60–75s):**

HOOK: LinkedIn's Kafka moves trillions of messages a day, writing every one to disk. Disk is supposed to be slow. So why is Kafka faster than memory-based queues? The answer breaks your intuition.

Random disk access is slow. Sequential disk access is shockingly fast, on modern drives it can rival RAM. Kafka's entire design is built around never doing random I/O.

A Kafka topic is an append-only log. New messages are only ever written to the end, sequentially. Consumers read sequentially too, tracking just an offset, a position in the log. No complex index to update, no random seeks. Just append and read forward.

Then there's zero-copy. Normally sending a file over the network copies data from disk to kernel buffer, to application memory, back to a socket buffer, wasteful. Kafka uses the sendfile system call to send data straight from the OS page cache to the network card, skipping the application entirely. Fewer copies, less CPU, higher throughput.

Add batching and compression of messages, and partitioning a topic across many machines for horizontal scale, and you get a firehose.

TAKEAWAY: Slow and fast are about access patterns, not the medium. Sequential beats random, and the fastest copy is the one you never make.

---



## 8. How Google Docs Lets 50 People Type at Once Without Chaos

**Difficulty:** Advanced

**Hook (first 3 sec):** Two people edit the same word at the same instant. Who wins? Google solved this with real math.

**Script (60–75s):**

HOOK: Fifty people typing in the same document, same sentence, same millisecond. Somehow nobody's text gets destroyed. This isn't luck, it's a genuinely hard computer science problem with two competing solutions.

The challenge, edits arrive out of order due to network lag. If I insert a character at position 5 and you delete at position 3 at the same time, my position 5 is now wrong by the time your edit lands. Naively applying both corrupts the document.

Solution one, Operational Transformation, OT, what Google Docs uses. Every edit is an operation, insert, delete. When operations conflict, the system transforms them against each other, adjusting indices so both can apply and everyone converges to the same final state. It's clever but notoriously hard to implement correctly, lots of edge cases.

Solution two, CRDTs, Conflict-free Replicated Data Types. Instead of transforming operations, give every character a unique, ordered identifier so edits merge deterministically no matter what order they arrive. More memory, far simpler conflict logic. Figma and many newer tools lean this way.

Both guarantee eventual consistency, everyone ends up identical.

TAKEAWAY: Real-time collaboration is a distributed consensus problem in disguise. OT versus CRDT is a classic senior-level trade-off, cleverness versus simplicity.

---



## 9. How Netflix Survives an Entire AWS Region Dying

**Difficulty:** Advanced

**Hook (first 3 sec):** Netflix deliberately shuts down its own servers in production. On purpose. Here's the genius.

**Script (60–75s):**

HOOK: Netflix runs a tool whose only job is to randomly kill its own production servers during business hours. This sounds insane. It's actually why Netflix stays up when AWS doesn't.

The tool is Chaos Monkey, part of chaos engineering. The philosophy, you don't actually know your system is resilient until you've seen it survive failure. So instead of hoping, you inject failure constantly and force the system to prove it.

Because servers die randomly all the time, engineers are forced to build every service to tolerate any instance vanishing. No single machine is precious. State lives in replicated stores, traffic reroutes automatically, and instances are cattle, not pets.

This ladders up to region-level resilience. Netflix runs active-active across multiple AWS regions. If an entire region degrades, traffic fails over to another region, and users barely notice. They practice this, real evacuation drills in production.

Backing it, aggressive fallbacks. If personalized recommendations fail, you get a generic popular row instead of an error. Graceful degradation over hard failure, always.

TAKEAWAY: Reliability isn't the absence of failure, it's designing so failure doesn't matter. The systems that never test failure are the ones that shatter when it finally comes.

---



## 10. How Tiny URLs Avoid Collisions at Billions of Links

**Difficulty:** Intermediate

**Hook (first 3 sec):** Generate a billion short links with zero duplicates and no coordination. Sounds impossible.

**Script (60–75s):**

HOOK: A URL shortener has to hand out billions of unique short codes, fast, with no two ever colliding, across many servers that can't stop to check with each other. Here's how it's really done.

The rookie approach, generate a random code and query the database to check if it exists. At scale that read-before-write on every single creation is a bottleneck, and collisions get more likely as the space fills.

Better approach, base62 encoding of a unique number. Take a globally unique, ever-increasing ID and encode it using 62 characters, a to z, A to Z, 0 to 9. Seven base62 characters give you over 3.5 trillion combinations. Because each ID is unique by construction, the short code is automatically unique. No collision check needed, ever.

So where does the unique ID come from without every server bottlenecking on one counter? Options, a range-based ID service that hands each server a block of IDs to burn through locally, or a scheme like Twitter's Snowflake that packs a timestamp, machine ID, and sequence number into one 64-bit integer, unique across the whole fleet with zero coordination.

Redirects then hit a cache, short codes are read far more than written.

TAKEAWAY: The best way to avoid checking for conflicts is to design a system where conflicts are mathematically impossible.

---



## 11. How Discord Stores Trillions of Messages

**Difficulty:** Advanced

**Hook (first 3 sec):** Discord outgrew MongoDB, then outgrew Cassandra. What they chose next is the real lesson.

**Script (60–75s):**

HOOK: Discord stores trillions of messages. They started on MongoDB, moved to Cassandra, then hit a wall and migrated again to ScyllaDB. The interesting part isn't the databases, it's WHY each one broke.

Messages are an append-heavy, read-heavy, effectively infinite dataset. The access pattern, load recent messages in a channel, fast. That shapes everything.

MongoDB couldn't keep the working set in memory as they grew, performance fell off a cliff. So they moved to Cassandra, a wide-column store built for massive write volume, partitioning messages by channel and time bucket so a channel's history lives together and reads stay local.

But Cassandra brought pain, garbage collection pauses in the JVM caused latency spikes, and hot partitions, a few huge channels, overwhelmed single nodes. Maintenance became a full-time firefight.

Enter ScyllaDB, Cassandra-compatible but written in C++ with no garbage collector and a shard-per-core architecture. Same data model, dramatically fewer latency spikes, far fewer nodes to run. They also added a data services layer to coalesce duplicate concurrent requests for the same hot channel, killing thundering-herd reads.

TAKEAWAY: You don't pick a database once. You pick it for your current scale and access pattern, and re-evaluate when the pattern outgrows the tool.

---



## 12. Why Every Big System Eventually Gives Up Strong Consistency

**Difficulty:** Advanced

**Hook (first 3 sec):** The CAP theorem forces a brutal choice, and almost every giant picks the same side. Here's why.

**Script (60–75s):**

HOOK: There's a theorem that says you fundamentally cannot have it all in a distributed system. It's called CAP, and understanding the choice it forces is what separates junior from senior engineers.

CAP, Consistency, Availability, Partition tolerance. Pick two. But here's the catch nobody tells juniors, in the real world networks fail, so partition tolerance isn't optional. Cables get cut, packets drop. So the real choice is only two options, when a partition happens, do you stay consistent or stay available?

CP systems choose consistency, during a partition they refuse requests they can't guarantee are correct. Think banking, a core ledger would rather reject your transaction than risk showing wrong money.

AP systems choose availability, they keep answering even if some nodes have slightly stale data, then reconcile afterward. This is eventual consistency. Think a social feed or a shopping cart, showing a like count that's a few seconds behind is totally fine, going down is not.

That's why systems like Cassandra and DynamoDB lean AP, and why they offer tunable consistency, you dial how many replicas must agree per operation, trading latency for correctness where it matters.

TAKEAWAY: Consistency versus availability isn't a purity contest. It's a business decision, made per feature, about what failure your users can actually tolerate.