# Pendientes

## To Fix

- [ ] El menú es más ancho que el contenido

## Tareas

- [ ] Verificar que El país se asigna al registrarse
- [ ] Cuando alguien se une a la sala, que haga un sonido
- [ ] Revisar que el código sea código moderno y usen context7, dejar esto en Claude
- [ ] Para un futuro que los países se puedan seleccionar por continente y sea vean las banderas de los países
- [ ] Que el nivel de dificultad diga en el 1. Solo minúsculas, 2. Minúsculas y mayúsculas, 3. Minúsculas, mayúsculas, acentos y puntuación, 4. Minúsculas, mayúsculas, acentos, puntuación y números, 5. Todo lo anterior más símbolos
- [ ] En el botón de revancha o en la pantalla de resultados debiese estar revancha con subir el nivel de dificultad
- [ ] Colocar un footer donde diga el autor
- [ ] Que se pueda ceder el host a otro jugador
- [ ] Visualizador de ping, en algún lugar visible, <120 ms verde, 120-250 ms amarillo , 250 ms o más ms rojo
- [ ] Salas publicas y privadas
- [ ] Tabla de posiciones de la semana en el home
- [ ] Salas activas en el home, que diga el nivel y la cantidad de jugadores
- [ ] Que en una feature futura, se vean las salas jugando en este momento, y listar las salas y poder ingresar como espectador a esas salas
- [ ] Instalar traqueo
- [ ] sí soy invitado y me registro, cuándo estoy viendo los datos de una partida, esos datos de esa partida se guardan sí me acabo de registrar, ¿los demás jugadores en sus registros verán invitado o mi nombre?
- [ ] que claudflare redirija www a apex
- [ ] Añadir un registro manual de sesión de nombre, usuario y contraseña
- [ ] Al terminar la Epic 4, solucionar todos los errores y warnings del servidor local
- [ ] Darle a la IA lso mensajes de la consola de los logs del servidor VPS para solucionar los warnings
- [ ] Que el usuario pueda agregar sus propios textos
- [ ] felicitar al jugador por entrar en los top 1000 mundial o top 1000 de su país
- [ ] pedirle a la ia que me actualice la arquitectura de la página y me dé la arquitectura de la db en el readme
- [ ] Que la aplicación pregunte sí quieres la revancha y en el tablero aparezca una R si es que la quieren o no
- [ ] Colocar broadcast en sincronización de pestañas cuando estén en el mismo link, para sincronizar lo que sucede en ambas pantallas
- [ ] En un futuro colocar gráficas de mejora en el perfil

## Preguntas

- [ ] Veríficar que los invitados no sean clickeables cuando haya invitados, ver el tema de qué es más ligero para el servidor, sí que diga simplemente invitado en el historial o sí sale el invitado exacto, con su número de invitado
- [ ] Cuando volvamos al lobby usa el mismo código de sala, es decir la partida nueva reescribe la anterior?, sí jugué 3 partidas con mis amigos se guarda la última?
- [ ] qué es este fallo "Los tests existentes siguen pasando (el fallo en game.gateway.spec.ts es
      pre-existente)"
- [ ] Debo hacer algo con estos warning: "Build: exitoso. Los warnings son de source-maps de @nestjs/throttler,
      pre-existentes."

# Realizados

### FiXs

- [x] El país no se asigna al registrarse, manualmente en el perfil hay que colocarlo
- [x] Falta cerrar sesión
- [x] Al menú en mobile le falta padding
- [x] Espacio insuficiente en el timer para más de 60 seg ![img](/Fix%20pendientes/espacio%20insuficiente%20en%20el%20timer%20para%20más%20de%2060%20seg.jpeg)

### Tareas

- [x] Tener un perfil, que sea visible públicamente y muestre las estadísticas de las partidas jugadas
- [x] Hacer al retrospectiva Epic 3
- [x] El logo del main del home debiese ser el logo de la web
- [x] Ingrese código de sala debiese decir código de partida
- [x] Que el pulse del botón "Listo" en el lobby se expanda el doble verticalmente que horizontalmente
- [x] Sacar el login, que alguien como invitado pueda jugar, sin tener que registrarse, que pueda crear sala y unirse, que al momento de los resultados le ofrezca registrarse, para ir guardando su progreso
- [x] Es muy brusco el cambio de numero en el tiempo, hay alguna transición suave
- [x] Por qué el temporizador se acaba a los 4 segundo, entiendo que puede haber un desface de 500ms a 1000ms, pero 4 segundos me parece mucho
- [x] Ver el tema del SEO para el home, y para cuando se comparta el link de una partida
- [x] El login solo permite google, debiese permitir github
- [x] og al readme
- [x] Debe decir "crear partida" en vez de "crear sala"
- [x] Ocupar el logo de la web como lo hizo para la ogg template
- [x] Sí la partida ya comenzó cuando entré, que me tire a ser espectador; sí la sala ya no existe, que me diga que la partida ya no existe
- [x] Revisar sí los fix fueron solucionados
- [x] Reparar los fix que no fueron reparados
- [x] Desplegar el proyecto en un servidor, ver el tema de las claves de postgres y redis, y tema de puertos expuestos
- [x] Verificar que funcione el login con github
- [x] Verificar que funcione req.ip -> No está funcionando
- [x] Los carets deben ser semi transparentes, puesto que tapan el texto que debo ver para escribir
- [x] La precisión me marca 100% cuando la partida es con tiempo, cuándo es sin tiempo marca correcto la precisión
- [x] Sí la partida es con tiempo, se debe ser el tiempo
- [x] Qué se pueda filtrar por país, añadir antes de ejecutar la epic 4
- [x] Crear un Epic completo para el tema visual

### Preguntas

- [x] Preguntar que son las spec AC y PRD en bmad
- [x] Sí elijo la revancha, es el mismo texto o puede ser cualquier otro
- [x] Seguridad de la bases de datos, cómo es el tema de las claves, que no las veo, la seguridad en la plataforma
- [x] Seguridad del sistema en general, sí no van a hackear mi vps y consumir mis recursos
- [x] Al ir haciendo mejoras voy Desplegando nuevamente la plataforma, la base de datos, los usuarios que se han registrado se pierden, sus registros se pierden con cada deploy o como es eso?
