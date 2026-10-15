# Definition

There are three type of materials, each with its own thickness. The assembly can be
constructed entirely from planar cuts on boards of the three materials.

Each part starts as a rectangular board in the XY, XZ or YZ plane, with its material's
thickness perpendicular to it. Axes follow the final orientation: x depth, y up,
z along the wall. Coordinates are board-local: zero is the wall-side, bottom or
start-side edge respectively. All cuts go through the full thickness unless stated otherwise.

The design is parameterized by several variables which should be editable.

Touching faces are assumed joined. Hinges, rails, handles and joinery details are
deferred; assume hardware fits the specified clearances and tolerances.

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
