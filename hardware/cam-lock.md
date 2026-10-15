# Cam lock

## Interface

Everything downstream depends only on these. Changing the product means updating these
values and checking the constraints.

- Cbd: cam bore diameter = 12
- Cbh: cam bore depth = 10.5
- Cb: receiving face to cam centre (B) = 28
- Ca: cam face to bolt axis (A) = 7. The drawing gives 6.5 (16 - 9.5) with a 10 bore; the cam
  rests on the bore bottom, so Cbh - Ca = 3.5 is what the kit fixes, and both move 0.5 deeper to
  keep hole coordinates in whole millimetres. Verify on a kit.
- Ced: edge bore diameter = 8
- Ceh: edge bore depth from the end edge = Cb = 28 (the drawing's 22 reaches the cam bore
  wall; drilling to the cam centre clears the bolt neck)
- Cnd: receiving hole diameter = 10 (insert nut)
- Cnh: receiving hole depth in a T1 face = 12
- Cnf: receiving hole depth in a T2 face = 11 (drawer fronts)

Constraints, with the cam in T2 and the receiving hole in T1:

- Cbh ≤ T2 - 4
- Ca + Ced/2 ≤ T2 - 3
- Cnh ≤ T1 - 8
- Insert nut length ≤ Cnf ≤ T2 - 4, for drawer fronts

## Shape

Modelled as coaxial cylinders, Ø × length:

- Cam: Ø11.8 × 9.6, from the cam face inward.
- Bolt, from the receiving face toward the cam: thread Ø6 × 8 into the nut, shank Ø8 × 22,
  neck Ø5 × 2, head Ø7 × 3, ending 27 from the face.
- Insert nut: Ø10.8 × 10.5, from the receiving face inward.

## Product

LOOTICH cam lock kit, Ø11.8 cam, M6x36 bolt, M6 nylon insert nut. Minifix 12 class.

- Source: Amazon.es [B09DL4D2Q1](https://www.amazon.es/dp/B09DL4D2Q1), 34 sets, €10.87
  (€0.32/set). 100-set pack: [B08NZV5DHX](https://www.amazon.es/dp/B08NZV5DHX), €17.78.
- Needed: 16 sets: 8 for the carcass, 8 for the drawer fronts. No dowels included.
- Specs from the listing's product drawings, drawn for a 16 mm cam panel.
- Cam: zinc alloy, nickel plated. Ø11.8 × 9.6.
- Bolt: zinc plated steel with plastic sleeve. M6, 36 long, 8 thread length, Ø8 shank,
  Ø7 head, 6.3 cross drive. 27 protrudes from the receiving face when seated.
- Insert nut: nylon, Ø10.8 × 10.5, M6 internal thread.
- Other bolt lengths 32/36/40/41 give Cb 25/28/33/34.
- To verify Cb on a kit: seat a bolt in its nut and measure from the face to the centre
  of the head's neck groove.
