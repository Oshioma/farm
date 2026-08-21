# Top Land shopfront — design source

Mockup for a public shopfront at `shamba.online/topland`: expected harvests
listed for pre-order, sign-up as a customer, reserve a share of a bed. No
payment step — reservations are settled on collection.

Five artboards, laid out by `canvas.json`:

| File | Screen |
| --- | --- |
| `Main.dc.html` | Shopfront home — hero, season calendar, produce grid |
| `Produce.dc.html` | One crop, its expected harvest by month, the pre-order panel |
| `SignUp.dc.html` | Customer sign-up, including their usual share |
| `Basket.dc.html` | Reservation summary and the confirmation state |
| `Mobile.dc.html` | The shop at phone width |

Only crops with an expected harvest appear in the shop — the same rule the
customer order section follows.

Bracketed text (`[pickup point]`, `[+254 telephone]`) marks a real detail that
still needs filling in. Produce, weights and prices are sample values shaped
like the Harvest ETA data that would replace them.

These are the editable source files. The published canvas is generated from
them and is not committed — it is ~2 MB of bundled editor.
