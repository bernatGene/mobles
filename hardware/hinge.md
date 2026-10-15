# Hinge

Concealed 35 mm cup hinge for the inset doors, with a cruciform mounting plate on the
side board. Two per door.

## Interface

Everything downstream depends only on these (`hinge` in `src/joinery.ts`). Defaults are
from the listing's drawing or common values; measure the hinges and replace them.

- Hcd: cup diameter = 35
- Hch: cup depth = 11.5
- Hce: door hinge edge to cup centre = 23 (listing gives a 5 mm boring distance, so 22.5)
- Hy: door top or bottom edge to cup centre = 80
- Hwl: wing plate height = 65
- Hss: wing screw spacing, vertical = 52
- Hsx: cup centre to wing screw line, toward the door's middle = 9
- Hml: mounting plate height = 54
- Hps: mounting plate screw spacing, vertical = 32
- Hpx: door back face to mounting plate screw line = 37
- Hpd: pilot hole diameter = 3
- Hph: pilot hole depth = 10

Constraints:

- Hch ≤ T2 - 3
- Hph ≤ T2 - 3 in the door, so the screws don't show on the front
- Hy ≥ Hwl/2 and 2*Hy + Hwl ≤ door height
- The lower mounting plate clears the bottom board: Dtol + Hy - Hml/2 > T2

## Shape

Simplified, door closed:

- Cup Ø Hcd × Hch in the door, rim Ø Hcd+3 × 1.2 on its back face, wing plate
  Hwl tall from 4 inside the cup's edge to 7 past the screws, Ø8 screw heads.
- Mounting plate: Hml × 14 bar, 2 thick, with a 20 × 40 × 8 boss, on the side board's
  inner face at Hpx.
- Arm: 10 × 18, from 12 behind the door to 30 past the plate screws, linked to the cup.
  The viewer swings the door about its front outer edge, so the link stretches.

## Product

Generic clip-on concealed hinge, 35 mm cup, 11.5 deep, cruciform plate. Four already
on hand; nothing to buy.
