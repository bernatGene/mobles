# Definition

There are three type of materials, each with its own thickness. The assembly can be
constructed entirely from planar cuts on boards of the three materials.

Each part starts as a rectangular board in the XY, XZ or YZ plane, with its material's
thickness perpendicular to it. Axes follow the final orientation: x depth, y up,
z along the wall. Coordinates are board-local: zero is the wall-side, bottom or
start-side edge respectively. All cuts go through the full thickness unless stated otherwise.

The design is parameterized by several variables which should be editable.

Touching faces are assumed joined. Hinges, rails, handles and joinery details not
covered under Joinery are deferred; assume hardware fits the specified clearances and
tolerances.

# Variables

Unless otherwise stated values are always mm. Currently they are placeholders.

- H: height = 950
- D: depth = 300
- L: length = 999
- T1: thickness material 1 = 29
- T2: thickness material 2 = 15
- T3: thickness material 3 = 3
- Ts: thickness skirting board = 20
- Tg: groove depth = 3
- R: rounding radius = 20
- Hs: height skirting board = 90
- Hl: height of legs = 190
- Dl: depth of legs = 40
- Hd: drawer row height = 100
- Oh: overhang = 10
- Dtol: door and drawer-front tolerance = 3
- Rc: drawer rail clearance per side = 13
- Bc: drawer clearance from the cabinet back panel = 5

## Derived drawer dimensions

- Wdf: drawer-front width = (L - 2*T1 - 3*Dtol)/2
- Wdb: drawer-body outside width = (L - 3*T1)/2 - 2*Rc
- Ddb: drawer-body depth, excluding the front = D - T2 - 2*T3 - Bc

# Parts

## Side board

- count = 2
- thick = T1

### Main board

- side y = H - T1
- side x = D

### Cuts

1. Leg opening: remove rectangle x=Dl…(D-Dl), y=0…Hl.
   - Round the two upper corners of the opening to radius R:
     (Dl, Hl) and (D-Dl, Hl), in (x, y) coordinates.
   - Rounding leaves material at these corners within the rectangle.

2. Skirting notch: remove rectangle x=0…Ts, y=0…Hs.
   - Square corners.

### Grooves

1. Back panel: rectangle x=T3…2*T3, y=Hs…(H-T1-T2+Tg).
   - Depth Tg into the inward-facing face.
   - Open at the bottom (through the skirting notch) so the back panel slides in from below.

## Top/Bottom board

- count = 2
- thick = T2
- side x = D (top board), D - T2 (bottom board)
- side z = L - 2*T1

### Cuts

1. Top board: remove rectangle x=0…Dl, z=(L-3*T1)/2…(L-T1)/2.
   - Square corners.

2. Bottom board: remove rectangle x=0…Dl/2, z=(L-3*T1)/2…(L-T1)/2.
   - Square corners.

### Grooves

On the top board's bottom face and the bottom board's top face:

1. Back panel: rectangle x=T3…2*T3, z=0…(L-3*T1)/2.
   - Depth Tg.

2. Back panel: rectangle x=T3…2*T3, z=(L-T1)/2…(L-2*T1).
   - Depth Tg.

## Top Desk

- thick = T1
- side x = D + Oh
- side z = L + 2 * Oh
- Round the two outer corners (D+Oh, 0) and (D+Oh, L+2*Oh),
  in (x, z) coordinates, to radius R.

## Center panel

- count = 1
- thick = T1
- side y = H - Hl - T1
- side x = D - T2

### Cuts

1. Bottom tab: remove rectangle x=Dl/2…(D-T2), y=0…T2.
   - Square corners.

2. Narrow section: remove rectangle x=Dl…(D-T2), y=T2…(H-Hl-T1-T2-2*Hd).
   - Square corners.

3. Top tab: remove rectangle x=Dl…(D-T2), y=(H-Hl-T1-T2)…(H-Hl-T1).
   - Square corners.

### Grooves

1. Back panels: rectangle x=T3…2*T3, y=0…(H-Hl-T1-T2+Tg).
   - Depth Tg into each of the two faces.
   - Open at the bottom so the back panels slide in from below.

## Back panel

- count = 2
- thick = T3
- side y = H - Hl - T1 - 2*T2 + 2*Tg
- side z = (L - 3*T1)/2 + 2*Tg

## Door

- count = 2
- thick = T2
- side y = H - Hl - T1 - T2 - 2*Hd - 2*Dtol
- side z = (L - 2*T1 - 3*Dtol)/2
- Inset beneath the drawers, hinged on the side boards.
- Extend downward over the bottom board. Gap Dtol at each side board, between the doors,
  above the bottom board's underside and below the drawers.

## Drawers

Four drawers with identical bodies and mirrored left/right front grooves, arranged
in two columns and two rows. Left is the z-start column; right is the z-end column.
Each front is aligned with the bottom of its Hd-high row, leaving Dtol above,
and covers the rail clearances and half the center panel. Gaps are Dtol at the
side boards, between columns, below the top board, between rows and above the doors.

Side panels butt against the inside face of the front. The back fits between the
sides, flush with their rear ends. All four walls have aligned top and bottom edges.
The body has clearance Rc per side for rails and Bc from the cabinet back panel.

### Front panel

- count = 4 (2 left, 2 right)
- thick = T2
- side y = Hd - Dtol
- side z = Wdf

#### Grooves

1. Left fronts: rectangle y=T3…2*T3,
   z=(Rc-Dtol+T2-Tg)…(Rc-Dtol+Wdb-T2+Tg).
   - Depth Tg into the wall-facing face.

2. Right fronts: rectangle y=T3…2*T3,
   z=(Wdf-Rc+Dtol-Wdb+T2-Tg)…(Wdf-Rc+Dtol-T2+Tg).
   - Depth Tg into the wall-facing face.

### Side panel

- count = 8 (2 per drawer)
- thick = T2
- side y = Hd - Dtol
- side x = Ddb

#### Grooves

1. Bottom panel: rectangle x=(T2-Tg)…Ddb, y=T3…2*T3.
   - Depth Tg into the inward-facing face.

### Back panel

- count = 4
- thick = T2
- side y = Hd - Dtol
- side z = Wdb - 2*T2

#### Grooves

1. Bottom panel: rectangle y=T3…2*T3, z=0…(Wdb-2*T2).
   - Depth Tg into the front-facing face.

### Bottom panel

- count = 4
- thick = T3
- side x = Ddb - T2 + 2*Tg
- side z = Wdb - 2*T2 + 2*Tg

# Joinery (tentative)

Joints visible from outside use cam locks plus wood dowels. Inner joints use threaded
inserts in T1 with bolts through T2, heads recessed. Carcass joints can be taken apart;
drawer boxes are glued, with cams at the fronts.

## Cam lock: side board ↔ top/bottom board

- count = 4 joints, 2 cams and 3 dowels each
- The T2 board's end edge butts into the T1 side's inner face, so the cam housing goes
  in the T2 board and the cam bolt in the side.
- Cam faces: top board's top face (hidden by the desk; tighten before fitting it),
  bottom board's underside.

### Hardware

Variables are defined in each hardware file's Interface section.

- Cam lock: [hardware/cam-lock.md](hardware/cam-lock.md). Cbd × Cbh cam bore in the T2
  cam face, centre at Cb from the side's inner face. Ced × Ceh edge bore from the T2 end
  edge, at Ca from the cam face. Cnd × Cnh receiving hole in the side's inner face, on
  the same axis.
- Dowel: [hardware/dowel.md](hardware/dowel.md). Wd × Wh holes in the T2 end edge,
  centred in T2 thickness, and in the side's inner face.

### Positions

In x along the T2 board, with d its depth (D top, D - T2 bottom):

- Dowels at x = 40, d/2, d - 40.
- Cams at x = 80, d - 80.

## Insert joint: desk ↔ top board

- count = 4
- Inserts in the desk underside, bolts up through the top board.
- Hardware: [hardware/insert.md](hardware/insert.md). Id × Ih in the desk, Ibd through
  the top board, Icd × Ich counterbore on its underside (drawers clear it by Dtol).

### Positions

In (x, z) on the top board, with Lt = L - 2*T1:

- (60, 60), (D - 60, 60), (60, Lt - 60), (D - 60, Lt - 60).

## Insert joint: center panel ↔ top board

- count = 2
- Inserts in the center panel's top edge where it meets the top board's underside,
  centred in T1. Bolts down through the top board, before the desk is fitted.
- Hardware: [hardware/insert.md](hardware/insert.md). Id × Ih in the panel edge, Ibd
  through the top board, Icd × Ich counterbore on its top face (under the desk).

### Positions

In (x, z) on the top board:

- (Dl + 40, Lt/2), (D - T2 - 40, Lt/2).

## Insert joint: center panel ↔ bottom board

- count = 1
- Insert in the underside of the center panel's front bearing strip (x = Dl/2…Dl), which
  rests on the bottom board. Bolt up through the bottom board, head on its underside with
  no counterbore: Icd wouldn't clear the notch edge at x = Dl/2. Engagement = Ibl - T2.
- Hardware: [hardware/insert.md](hardware/insert.md). Id × Ih in the panel, Ibd through
  the bottom board.

### Positions

In (x, z) on the bottom board:

- (Dl - 13, Lt/2). Leaves 8.75 of panel in front of the insert and 3.5 of board between
  the bolt hole and the notch.

## Drawer boxes

- Side ↔ front: 1 cam lock and 2 glued dowels per joint, so pulling the drawer loads the
  cam rather than the glue. Cam in the side's inner face at Cb from the front, edge bore
  in the side's front end edge, insert nut in the front's inner face, Cnd × Cnf.
  Dowels into the side's front end edge (Wh), centred in T2, and the front's inner face (Wf).
- count = 4 drawers × 2 cams and 8 dowels, Ø8 × 30, glued both sides.
- Back ↔ side: into the back's end edge (Wh), centred in T2, and the side's inner face (Wf).
- Hardware: [hardware/dowel.md](hardware/dowel.md).

### Positions

Dowels two per joint, at y = (Hd - Dtol)/2 ± 25 from the drawer bottom edge. Cams at
y = (Hd - Dtol)/2.

## Hinges

- count = 2 doors × 2 hinges
- Cup in the door's back face, mounting plate on the side board's inner face. The door is
  inset, so the plate screw line is Hpx behind the door's back face: x = D - T2 - Hpx.
- Hardware: [hardware/hinge.md](hardware/hinge.md). Only the cup and screw pilot holes
  are drilled.

### Positions

Cups at Hce from the door's hinge edge, Hy from its top and bottom edges. Wing pilots
Hss apart vertically, Hsx from the cup centre toward the door's middle. Plate pilots
Hps apart vertically, centred on the cup height.

## Drawer rails

- count = 4 pairs, side-mount, in the Rc clearance on each side of the drawer body.
- Hardware: [hardware/drawer-rail.md](hardware/drawer-rail.md).
- Both members' front ends flush with the drawer body's front, x = D - T2, closed.
- Rail centreline Ry below the middle of the drawer side, clear of the drawer cam.
- Cabinet members screw through the round holes, except the right column's center-panel
  rail, which uses the slots Rks behind them, so the center panel's two faces don't share
  pilot positions.
- Drawer pilots at Rd from the front, snapped down to whole millimetres; cabinet pilots
  at Rk from the front, on the side boards and both faces of the center panel.

## Holes per board

Variables from the hardware files. All holes are blind unless stated. "Centred" holes
snap down to whole millimetres (7 in a 15 board), so drawings avoid half-millimetre
coordinates.

- Side board, inner face: 4 × Cnd × Cnh cam nut holes, 6 × Wd × Wh dowel holes,
  4 × Hpd × Hph hinge plate pilots, 6 × Rpd × Rph rail pilots.
- Center panel, each face: 6 × Rpd × Rph rail pilots.
- Door, back face: 2 × Hcd × Hch hinge cups, 4 × Hpd × Hph wing pilots.
- Top board:
  - Top face: 4 × Cbd × Cbh cam bores, 2 × Icd × Ich counterbores (center panel).
  - Underside: 4 × Icd × Ich counterbores (desk).
  - End edges: 4 × Ced × Ceh edge bores, 6 × Wd × Wh dowel holes.
  - 6 × Ibd through holes, one under each counterbore.
- Bottom board: underside 4 × Cbd × Cbh cam bores; end edges 4 × Ced × Ceh edge bores,
  6 × Wd × Wh dowel holes; 1 × Ibd through hole (center panel).
- Desk, underside: 4 × Id × Ih insert holes.
- Center panel, top edge: 2 × Id × Ih insert holes, centred in T1. Bearing strip
  underside: 1 × Id × Ih insert hole, centred in T1.
- Drawer front, inner face: 4 × Wd × Wf dowel holes, 2 × Cnd × Cnf cam nut holes.
- Drawer side:
  - Inner face: 2 × Wd × Wf dowel holes, 1 × Cbd × Cbh cam bore.
  - Outer face: 3 × Rpd × Rph rail pilots.
  - Front end edge: 2 × Wd × Wh dowel holes, 1 × Ced × Ceh edge bore.
- Drawer back, end edges: 4 × Wd × Wh dowel holes.
