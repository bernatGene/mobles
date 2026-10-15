# Threaded insert

M6 screw-in insert in a T1 face or edge, with an M6 button head bolt through a T2 board.

## Interface

Everything downstream depends only on these. Changing the product means updating these
values and checking the constraints.

- Id: insert hole diameter = 8.5 (seller states 8; test on scrap, +0.5 in edges)
- Ih: insert hole depth = 18
- Il: insert length = 15
- Ibd: bolt clearance hole diameter in T2 = 7
- Icd: bolt head counterbore diameter in T2 = 12
- Ich: bolt head counterbore depth in T2 = 4
- Ibl: bolt length = 25
- Engagement = Ibl - (T2 - Ich) = 14

Constraints, with the insert in T1 and the bolt through T2:

- Ih ≤ T1 - 8 (face)
- Id ≤ T1 - 16 (edge, centred)
- 9 ≤ Engagement ≤ Il
- Ich ≥ bolt head height + 0.5, so the head sits below the T2 face

## Shape

Modelled as coaxial cylinders, Ø × length:

- Insert: Ø10.5 × 15, from the T1 face inward. Flange not modelled.
- Bolt: head Ø10.5 × 3.3 at the bottom of the counterbore, shank Ø6 × 25 toward the insert.

## Product

### Insert

HAISHANG M6x15 flanged insert, zinc plated carbon steel, hex socket drive.

- Source: Amazon.es [B0FX1YFTKS](https://www.amazon.es/dp/B0FX1YFTKS), 20 + hex key,
  €7.49 (€0.37/u).
- Needed: 7, plus spares.
- Length 15 is from the listing. Outer thread ~Ø10.5 and flange ~Ø12 are inferred from
  comparable listings; measure on arrival.
- Countersink the hole to the flange Ø by ~1 so the flange doesn't lift the face veneer.
- Drive square, with the hex key or a bolt and jam nut in a drill press.

### Bolt

M6x25 button head, ISO 7380, black 10.9.

- Source: Amazon.es [B0FFSC2H21](https://www.amazon.es/dp/B0FFSC2H21), 20, €7.99.
- Head ~Ø10.5 × 3.3.
