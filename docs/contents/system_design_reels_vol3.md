# System Design Reels — Volume 3 (Gaming & Consumer Tech War Stories)

## 1. How Valorant Detects You Were Actually Shot First

You swear you shot first, but the enemy killed you. On your screen you won that duel, on theirs they did. Both of you saw a different reality, and Riot's servers had to pick a winner in milliseconds. This is the hardest problem in competitive shooters, and here's how it's solved.

The root issue is latency. Your inputs travel to the server and back, so by the time the server sees your shot, time has already passed. Meanwhile the enemy moved. If the server naively used only its own current view, you'd have to aim ahead of every moving target, which feels awful.

The fix is server-side lag compensation. Riot's Valorant runs authoritative servers at 128 ticks per second, meaning the server updates the game state 128 times a second, twice the rate of many rivals. Every tick, it records where every player was. When your shot arrives, the server rewinds. It reconstructs the world exactly as it looked on your screen at the moment you fired, accounting for your ping, and checks the hit against that rewound snapshot.

So the server literally asks, when this player pulled the trigger, was their crosshair on the enemy in the world they actually saw? If yes, it counts, even though the enemy has since moved on the server's live timeline.

This is why peeker's advantage exists, the person moving around a corner sees the defender a fraction before the defender sees them. Lag comp can't erase physics, only make hits fair to the shooter's view.

Takeaway, in real-time multiplayer the server is the single source of truth, but to feel fair it has to remember the past and judge your action against the world you saw, not the world it sees now.

## 2. How Discord Sends Your Voice to a Server Room in Another Country

You talk in a Discord call and your friend hears you almost instantly, even though your voice is being crunched, shipped across the planet, and rebuilt, dozens of times a second. Gaming voice chat is a brutal real-time problem, and Discord's design is a clean lesson in choosing the right trade. Here's how it works.

Your voice goes out over UDP, not TCP, and that choice is the whole story. TCP guarantees delivery, if a packet drops it stops and resends. For voice that's a disaster, a resent packet arriving late is useless, you've already moved past that word, and the pause is worse than the loss. UDP just fires packets and doesn't look back. A dropped audio packet is barely a blip, but low latency is preserved. For live voice, timely beats perfect.

Your audio is compressed with the Opus codec, tuned for speech at low bandwidth, then sent to a Discord voice server. Here's a key design point, your voice doesn't go peer to peer to each friend. It goes to a selective forwarding server that relays your stream to everyone else in the channel. This means you upload your voice once, no matter how many people are listening, instead of once per listener, which would crush your connection in a big call.

Discord runs these voice servers in regions around the world and routes your call to one near the group, keeping the physical distance, and the delay, small.

Takeaway, real-time voice is about accepting imperfection for speed, drop the lost packet, compress hard, relay through one smart server, and pick UDP because late-but-complete is worse than fast-but-lossy.

## 3. How Fortnite Puts 100 Players on One Map Without Chaos

100 players, hundreds of built structures, bullets and items everywhere, all in one shared world updating in real time. If every player's game had to know about everything at once, the network would collapse. Here's how battle royales stay smooth.

The core trick is that the server does not tell you about the whole map. It tells you only what's relevant to you right now. This is relevancy or area-of-interest filtering. The world is divided spatially, and the server only sends you updates about players, projectiles, and objects near you or that can affect you. A fight happening across the island generates zero network traffic for you until it matters. This alone cuts the data each client handles by a massive factor.

Next is the authoritative server model, same as Valorant. The server owns the true game state to fight cheating, but sending a full state update to 100 players many times a second is enormous bandwidth. So updates are delta-compressed, the server sends only what changed since your last update, not the entire world. If a wall didn't move, it's not re-sent.

Then there's client-side prediction to hide latency. When you press move, your character moves immediately on your screen using local prediction, rather than waiting for the server round trip. The server later confirms, and if your prediction was slightly off, it gently corrects you, that occasional rubber-banding you feel is a misprediction being reconciled.

Takeaway, you scale a shared real-time world not by sending everyone everything, but by sending each player the small slice that's relevant, only the changes, and predicting locally so it feels instant.

## 4. How Spotify Knows the Exact Song You Want Next

Spotify hands 600 million people a personalized playlist that feels handmade, every week, without a human touching it. Behind Discover Weekly is a recommendation engine blending three very different techniques, and the combination is the clever part. Here's the breakdown.

First, collaborative filtering. The system builds a giant matrix of who listened to what. If you and I overlap heavily on songs, and you love a track I've never heard, it's a strong bet for me. It's finding people with similar taste and cross-pollinating. But this has a cold-start problem, a brand-new song nobody has streamed yet has no listening data, so pure collaborative filtering can't surface it.

So second, audio content analysis. Models listen to the raw audio itself, tempo, energy, timbre, and place each song in a feature space. Now a new track can be recommended based on how it sounds, similar to things you already love, even with zero streams. That solves cold start.

Third, natural language processing over the culture around music, playlist names, blog posts, how people describe artists. If a song keeps getting bucketed with words like mellow late-night focus, that context sharpens who it fits.

These signals feed models that predict what you'll actually play and finish, not just click. And it all runs on massive batch data pipelines, crunching billions of listening events to refresh everyone's recommendations on schedule.

Takeaway, great recommendations aren't one algorithm, they're an ensemble, behavior tells you what similar people love, content saves you when there's no behavior yet, and context tells you what a song actually means.

## 5. How Twitch Streams Live Video to Millions With Almost No Delay

A streamer plays live, and hundreds of thousands watch within seconds, all reacting in chat in near real time. Live video is far harder than Netflix, because you can't pre-encode or pre-cache something that's happening right now. Here's how Twitch pulls it off.

The stream starts at the broadcaster, whose software sends video to Twitch's ingest servers, the front door. That single incoming stream now has to reach a massive, unpredictable audience, so it hits a transcoding pipeline that produces multiple quality versions on the fly, source, 720p, 480p, so a viewer on weak internet still gets a watchable feed. This is adaptive bitrate again, but done live under time pressure.

Then distribution. The transcoded stream is chopped into small segments, a few seconds each, and pushed out through a CDN of edge servers worldwide. When you watch, you pull segments from an edge near you, not from the origin, which is what lets one stream serve millions. Popular streams get replicated across many edges automatically.

The central tension is latency versus stability. Bigger buffered segments mean smoother playback but more delay, small segments mean lower latency but more risk of stutter. Twitch offers a low-latency mode that shrinks segments so a streamer can react to chat almost live, trading a little buffering safety for that connection.

And chat is a completely separate real-time system running alongside the video, a massive message fan-out problem of its own, delivering a firehose of messages to every viewer at once.

Takeaway, live video can't lean on pre-computation like on-demand can, so it wins with fast on-the-fly transcoding, segmented CDN delivery, and a deliberate choice about how much delay you'll trade for smoothness.

## 6. How League of Legends Stops Cheaters Without Watching Every Move

In a competitive game with millions of matches, a single undetected cheat can ruin thousands of games and poison the ranked ladder. Riot can't have a human watch everyone, so anti-cheat becomes a large-scale systems and detection problem. Here's the architecture of catching cheaters.

The first principle is never trust the client. A player's game is running on their machine, which they fully control and can tamper with. So the authoritative server holds the real game state and validates actions. If your client claims you moved somewhere impossible or fired faster than the game allows, the server rejects it. Anything the client alone asserts is treated as a suspect claim, not truth.

But many cheats, like aimbots or wallhacks, don't send impossible actions, they just make a real player superhuman. So the second layer is behavioral detection. Systems collect signals, aim patterns that are inhumanly precise, reaction times below what's biologically possible, movement that reacts to enemies the player shouldn't be able to see. Machine learning models trained on known cheaters versus legit pros flag anomalies at scale across millions of games.

The third layer is deliberately quiet, detection is decoupled from banning. Instead of banning the instant a cheat is detected, systems often gather evidence over time and issue bans in waves. This hides exactly what tripped the detection, so cheat developers can't quickly reverse-engineer which behavior got caught and patch around it.

Takeaway, anti-cheat at scale is defense in depth, make the server the source of truth so blatant cheats fail, use ML on behavior to catch subtle ones, and stay opaque about detection so the arms race stays in your favor.

## 7. How Pokemon GO Survived Being 50 Times More Popular Than Planned

Niantic planned for a big launch. They got one that was roughly 50 times their most optimistic estimate, servers melting as half the planet tried to catch Pokemon in the same week. It became one of the most famous scaling crises in tech. Here's what breaks at that scale and how you fix it live.

The first thing to understand is the workload. This wasn't just app traffic, it was millions of players constantly sending GPS locations and querying the game world around them in real time, a relentless geospatial read-and-write firehose. Every wall the system hit came from that constant location churn multiplied by an audience no one sized for.

The database was the first casualty. A sudden surge like that overwhelms your data layer, so the survival playbook kicks in, aggressive caching to keep hot reads off the database, horizontal scaling to add capacity, and sharding the data so no single node holds the whole world. Niantic worked with Google's cloud infrastructure to scale container capacity far beyond the original plan, essentially rebuilding the plane while flying it.

They also made hard triage calls, temporarily disabling features like the creature-tracking system that were too expensive to serve under load. That's a key real-world lesson, graceful degradation, cut the costly non-essential feature to keep the core game alive, rather than letting everything crash together.

The deeper takeaway is about capacity as a spectrum, you provision for expected load, autoscale for surprises, and still have a plan for the black-swan spike that blows past every estimate.

Takeaway, you cannot perfectly predict viral demand, so you design to scale horizontally, cache and shard the hot path, and be ready to shed non-essential features fast so the core experience survives the surge.

## 8. How Netflix Decides Which Thumbnail Makes You Click

Two people open Netflix and see the same show with completely different cover images, and each was chosen to make that specific person click. Netflix runs one of the largest experimentation systems on earth just to pick artwork, and it's a masterclass in testing at scale. Here's how.

The engine is A/B testing, but industrialized. For a single title, Netflix has many candidate thumbnails, a dramatic close-up, an action shot, a villain, a romantic pairing. The question is which one earns the most plays. So they show different images to different randomized groups of users and measure who actually watches, not who just looks.

The first hard part is doing this for thousands of titles and image combinations at once, without experiments contaminating each other, and while making sure each user's experience stays consistent so it doesn't feel glitchy. That requires a serious experimentation platform, assigning users to groups, tracking outcomes, and computing statistical significance so a random lucky streak isn't mistaken for a real winner.

The deeper layer is personalization. It's not just which image wins overall, it's which image wins for you. Someone who watches lots of comedies might respond to a cast image, an action fan to an explosion. The system learns these patterns and tailors artwork to taste, which is why your friend's Netflix looks different from yours.

And the same experimentation muscle runs everything, row ordering, autoplay behavior, the recommendation algorithm itself, all continuously tested against real engagement.

Takeaway, at scale you don't guess what works, you build a platform to measure it, run thousands of rigorous experiments in parallel, demand statistical significance, and then personalize the winner down to the individual.

## 9. How Minecraft Generates an Infinite World Out of Thin Air

Minecraft's world is effectively endless, far bigger than any planet, yet it ships as a small download and runs on a laptop. The world isn't stored anywhere, it's conjured the instant you walk toward it. Here's the beautiful trick behind infinite worlds.

The secret is procedural generation. The terrain isn't a giant pre-built map loaded from disk, it's computed on demand by an algorithm. At its heart is noise, specifically Perlin-style noise, a mathematical function that produces smooth, natural-looking randomness. Feed it a coordinate and it returns a value, and by layering these noise functions you get rolling hills, mountains, caves, and biomes that look organic instead of random static.

The magic ingredient is the seed. The entire world is derived deterministically from one starting number. Same seed, same coordinates, always the same terrain, every single time, on every machine. That's why players can share a seed and explore the identical world, nothing was stored, the number plus the algorithm recreate it perfectly. The world isn't saved, it's a formula.

Now the systems part, you still can't compute the whole infinite world at once. So it's divided into chunks, small columns of blocks. As you move, chunks around you are generated and loaded, and distant chunks you've left are unloaded from memory, that classic sliding window over an unbounded space. Only the blocks you've actually changed need saving to disk, the untouched world can always be regenerated from the seed.

Takeaway, you don't store an infinite world, you generate it deterministically from a seed, load it in chunks around the player, and persist only the differences, letting math stand in for terabytes of data.

## 10. How Zoom Keeps 1,000 Faces in Sync on One Call

A thousand people on one video call, and somehow your laptop doesn't catch fire trying to receive a thousand video streams. Group video looks like it should be impossible on normal hardware, and the architecture that makes it work is a genuinely clever design choice. Here's how.

Start with the naive approach, a full mesh, where everyone sends their video directly to everyone else. In a 1,000-person call, each person would upload 999 copies of their video and download 999 streams. Your upload and your device would die instantly. Mesh only works for tiny calls.

The fix Zoom uses is a Selective Forwarding Unit, an SFU. You upload your video exactly once, to a central media server. That server then forwards your stream to everyone else, and forwards their streams to you. Now you're uploading one stream regardless of call size, and the heavy fan-out work lives on powerful servers, not your laptop.

But even downloading 1,000 incoming streams is too much, so the SFU is smart about what it sends you. It only forwards video for the people actually visible on your screen, the active speaker and the current gallery page. The 950 people you're not looking at aren't being decoded on your device at all. And it uses simulcast, each person uploads a few quality tiers, so the server can send you a tiny thumbnail-quality version of a gallery face and a crisp version of the active speaker, matching quality to how much screen space they take.

Takeaway, massive group video works by never going peer-to-peer at scale, upload once to a forwarding server, and have that server send each person only the streams they can see, at the quality they actually need.

## 11. How Steam Delivers a 100GB Game to Millions on Launch Day

A blockbuster game launches, it's 100 gigabytes, and millions of players all try to download it in the same hour. That's a tidal wave of data that would flatten any single server. How Steam ships that mountain of bytes worldwide is a lesson in content delivery at extreme scale. Here's the design.

No single origin server can feed millions at once, so the game files live on a global CDN, a network of caching servers spread across the world, often placed right inside internet providers. When you download, you're pulling from an edge server geographically near you, not from one central Valve machine. Your bytes travel a short distance, and the load is spread across hundreds of locations instead of concentrated in one.

The files themselves are broken into chunks, and this unlocks two big wins. First, parallelism, your client downloads many chunks simultaneously from the fastest available sources, saturating your connection. Second, efficient updates, when a game patches, Steam compares chunks and downloads only the ones that actually changed, a form of delta updating, so a small fix doesn't re-download the whole 100GB.

To handle the launch spike, publishers use preloading, the game is downloaded and sitting encrypted on your drive days early, then unlocked at release. This is brilliant load management, it spreads a demand spike that would happen in one hour across several days, flattening the peak the infrastructure has to survive.

Takeaway, delivering huge files to a global crowd means pushing content to edges near users, chunking it for parallel downloads and tiny patches, and smoothing demand spikes with preloading so launch hour isn't a single deadly peak.

## 12. How Among Us Accidentally Scaled From 30 Players to Half a Billion

Among Us was built by a tiny team for a small audience, then exploded to hundreds of millions of players seemingly overnight, years after release. The servers were never designed for it, and the scramble to survive is one of the best real-world scaling stories in gaming. Here's what happens when a small system meets sudden massive success.

The original architecture was simple and, at the time, sensible, largely peer-hosted style matchmaking and lightweight servers sized for a modest crowd. That's a completely reasonable choice for a small game, you don't over-engineer for scale you'll never see. But it means the system has assumptions baked in that shatter when the audience multiplies by thousands.

The first thing that breaks under a surge like this is almost always the coordination layer, matchmaking and the servers that place players into game lobbies. Connecting millions of players into small game sessions is a constant, high-frequency operation, and that becomes the bottleneck long before the actual gameplay does. The developers publicly battled server issues, region by region, as demand kept climbing.

The survival path is the familiar playbook applied under fire, move to scalable cloud infrastructure, add server capacity horizontally across regions so players connect to nearby machines, and relentlessly optimize the matchmaking hot path. It's the same lesson as Pokemon GO and Among Us both learned, the difference between a prototype and a platform is whether the system can grow sideways when demand explodes.

The honest takeaway is that this is a good problem created by a hard truth, you can't cheaply pre-build for scale you have no reason to expect, so resilience is partly about how fast you can re-architect when lightning strikes.

Takeaway, sudden viral success breaks the coordination and matchmaking layer first, and surviving it means scaling horizontally onto elastic infrastructure fast, the real skill isn't predicting the surge, it's being able to grow sideways when it hits.
