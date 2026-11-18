% title: The Simple Pendulum
% subtitle: Study notes

# The simple pendulum

A small mass on a light string swings back and forth. For small angles the motion is
nearly *simple harmonic*, which gives a period that does not depend on the mass.

## Equation of motion

Taking moments about the pivot, with $\theta$ the angle from the vertical:

$$
\frac{d^2\theta}{dt^2} + \frac{g}{L}\sin\theta = 0
$$

For small angles $\sin\theta \approx \theta$, so the period is

$$
T = 2\pi\sqrt{\frac{L}{g}}
$$

## Measured periods

Table: Ten swings timed for three string lengths ($g = 9.81\ \mathrm{m/s^2}$).

| Length $L$ (m) | Measured $T$ (s) | Predicted $T$ (s) | Difference |
| --- | --- | --- | --- |
| 0.25 | 1.01 | 1.003 | 0.7 % |
| 0.50 | 1.42 | 1.419 | 0.1 % |
| 1.00 | 2.02 | 2.006 | 0.7 % |

## Quick check in code

```python
from math import pi, sqrt

def period(length_m, g=9.81):
    """Small-angle period of a simple pendulum, in seconds."""
    return 2 * pi * sqrt(length_m / g)

print(round(period(1.0), 3))  # 2.006
```

## To do

- [x] Time ten swings for each length
- [x] Compare with the small-angle formula
- [ ] Repeat at a 30° release angle

> The period grows slowly with amplitude: at 30° it is about 1.7 % longer than the
> small-angle value.
