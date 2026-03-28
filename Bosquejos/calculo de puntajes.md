# ¿Cómo se calculan los puntos?

- El wpm ese esa la formula típica y conocida.
- La precisión, pretendo que sea (cantidad de caracteres erroneos)/(cantidad de caracteres totales del texto), esto da un decimal entre 0 a 1, el usuario lo debe ver como porcentaje
- Caracteres faltantes (en caso de que se termine el tiempo y no completo todo el texto, faltan caracteres por recorrer)

y la puntuación final del usuario es: wpm x 10 x precisión - (caracteres faltantes x 2)

## Ejemplo 1 (de cuando el usuario terminó el texto):

wpm: 76,2787
multiplicado estático: 10
Precisión: 0,9259
caracteres faltantes: 0
multiplicador estático como castigo de caracteres faltantes: 2
_el calculo se ejecuta con los valores truncados a 2 decimales_

76,27 x 10 x 0,92 - (0 x 2) = 701,68

## Ejemplo 2 (de cuando el usuario terminó el texto):

wpm: 69,1259
multiplicado estático: 10
Precisión: 0,9842
caracteres faltantes: 12
multiplicador estático como castigo de caracteres faltantes: 2
_el calculo se ejecuta con los valores truncados a 2 decimales_

69,12 x 10 x 0,98 - (12 x 2) = 653,37
