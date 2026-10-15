# Drawer rail

Side-mount ball-bearing slides, 45 high, 250 long, full extension. One pair per drawer.

## Interface

Everything downstream depends only on these. Changing the product means updating these
values and checking the constraints.

- Rl: rail length, closed = 250
- Re: extension travel = 250 (full extension; the sheet gives no exact figure)
- Rh: rail height = 45
- Rt: rail thickness = installed clearance per side = 12.7
- Rk: cabinet member screw holes, from its front end = 35, 67, 163
- Rd: drawer member screw holes, from its front end = 24.5, 120.5, 216.5 (Ø4.3), each with
  a 4.6 × 6 adjustment slot; the front one has its slot 9 behind it, at 33.5
- Rs: screw = Ø4 pan head × 12 (wood), or Ø6.3 euro screw in the cabinet member's round holes
- Ry: rail centreline from the drawer side's middle = -10
- Rks: cabinet member slot centre behind the group's round hole = 12 (not dimensioned on
  the drawing; estimated from its detail, measure)
- Rpd: pilot hole diameter = 3
- Rph: pilot hole depth = 10

Mounting: drawer member front end flush with the drawer side's front end. Cabinet member
front end flush with the front panel's inner face, D - T2 from the back of the side board.
Both members share the same rail centreline height. Holes are on the rail's centreline
(assumed from the drawing, not dimensioned).

Constraints:

- Rt ≤ Rc ≤ Rt + 0.5. Rc = 13 is fine; 12.7 + 0.3 absorbs carcass error without the
  drawer dropping out.
- Rl ≤ Ddb
- Rl ≤ D - T2 - 2*T3, so the cabinet member clears the back panel.
- Screw length ≤ T2 - 3 in the drawer side.
- Screw length ≤ (T1 - 1)/2 in the center panel, which carries rails on both faces.
- |Ry| ≥ Cbd/2 + 2 = 8: the front drawer hole at Rd = 24.5 lands on the cam bore
  (Cb = 28 ± Cbd/2), which leaves only T2 - Cbh = 4.5 of wood under the screw. Ry
  must also keep the rail clear of the lower dowel (y = (Hd - Dtol)/2 - 25, ends 21 from
  the front) and inside the side: Rh/2 ≤ (Hd - Dtol)/2 + Ry.
- The right column's center-panel rail screws through the slots, Rks behind the round
  holes, so the center panel's two faces don't share pilots; even aligned, 2 × Rph < T1.

## Shape

Three channels, Rl long and Rt/3 thick each, from x = D - T2 - Rl to D - T2 closed:

- Cabinet member Rh high against the wall, middle member 0.8 Rh, drawer member 0.6 Rh
  against the drawer side. The middle member travels half as far as the drawer.

## Product

Emuca 3043105, ball-bearing full extension slide, 45 × 250, zinc plated, with
disconnect lever.

- Source: Amazon.es [B079MH293H](https://www.amazon.es/dp/B079MH293H), pack of 5 pairs,
  €27.15 (€5.43/pair). Black version: [B0989RNXV5](https://www.amazon.es/dp/B0989RNXV5),
  €28.74.
- Needed: 4 pairs, plus 1 spare.
- Spec sheet: [drawing](https://d7rh5s3nxmpy4.cloudfront.net/CMP1941/files/4/30431.PT01.pdf),
  [hole table](https://d7rh5s3nxmpy4.cloudfront.net/CMP1941/files/3/30431.PT11.pdf),
  [product page](https://www.emuca.com/es/guias/de-bolas/de-extraccion-totallote-de-5-juegos-de-guias-para-cajones-de-bolas-altura-45mm-profundidad-250mm-extraccion-total-cincado-3043105).
- Verified from the sheet: 45 high, 12.7 thick, L = 250, cabinet holes 35 from the front
  plus 32 and A = 128 from there, cabinet hole detail 9.5 × 4.6 slot + 2 × Ø6.3,
  drawer holes Ø4.3 + 4.6 × 6 slots at 24.5 from the front, then Z = 96 and Y = 192 from
  there, 9 between the front hole pair.
- Load: 35 kg/pair on Amazon, 30 kg/pair on emuca.com.
- Not verified: exact travel, screw size (not included, none specified; the site says
  boards > 16, our drawer sides are 15), holes being on the centreline.
- Emuca has no soft-close 45 mm slide at 250; their soft-close and push lines start at 300.

Alternatives:

- Soft close: GTV VERSALITE H45, PK-L-H45-250-A, full extension with damper,
  30 kg/pair, about 30 extension loss. Amazon.es
  [B075F5VWK9](https://www.amazon.es/dp/B075F5VWK9), €8.01/pair, €32 for 4. Hole
  positions not checked; re-check Rk and Rd before drilling.
- SO-TECH KV3-45-H45-L250-NF, black, 45 × 250 × 12.7, full extension, 45 kg/pair.
  Amazon.es [B06VYBK7YX](https://www.amazon.es/dp/B06VYBK7YX), €9.71/pair. Hole
  positions not checked.
