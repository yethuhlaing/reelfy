# Credit rules for a Run

Type: grilling
Status: resolved

## Question

When is a user charged, refunded, or left as-is for a Run?

Cover: enqueue, explicit cancel, fail, retry after failed, and a second submit that hits an in-flight Run (must not double-charge). Rules only — not how Polar is called.

## Answer

Synthesized in [Video processing kernel](../spec.md): reserve on start, no second reserve on in-flight, release on cancel/fail, retry reserves only remaining Steps. Chat `creditHolds` stay chat-only.
