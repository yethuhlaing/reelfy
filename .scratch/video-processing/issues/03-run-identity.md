# What identifies a Run

Type: grilling
Status: open

## Question

What is the identity of a Run, such that a second submit returns the existing in-flight Run instead of enqueueing another fal request?

Need a unique key per path (scene, story, brainrot project, lofi video, or something else), and the rule for “one in-flight Run per target.” Also: when a Run is terminal, does a new user action create a new Run or reuse the old one?
