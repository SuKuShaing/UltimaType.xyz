# Pendientes

## Tareas

- [x] Sacar el login, que alguien como invitado pueda jugar, sin tener que registrarse, que pueda crear sala y unirse, que al momento de los resultados le ofrezca registrarse, para ir guardando su progreso
- [x] Es muy brusco el cambio de numero en el tiempo, hay alguna transición suave
- [x] Por qué el temporizador se acaba a los 4 segundo, entiendo que puede haber un desface de 500ms a 1000ms, pero 4 segundos me parece mucho
- [x] Ver el tema del SEO para el home, y para cuando se comparta el link de una partida
- [x] El login solo permite google, debiese permitir github
- [x] og al readme
- [x] Debe decir "crear partida" en vez de "crear sala"
- [x] Ocupar el logo de la web como lo hizo para la ogg template
- [x] Sí la partida ya comenzó cuando entré, que me tire a ser espectador; sí la sala ya no existe, que me diga que la partida ya no existe
- [ ] Cuando alguien se une a la sala, que haga un sonido
- [ ] Que el pulse del botón "Listo" en el lobby se expanda el doble verticalmente que horizontalmente
- [ ] Hacer al retrospectiva
- [ ] Hacer el resto de Epics

- [ ] que claudflare redirija www a apex
- [ ] Añadir un registro manual de sesión de nombre, usuario y contraseña
- [ ] El país no se asigna al registrarse, manualmente en el perfil hay que colocarlo
- [ ] Darle a la IA lso mensajes de la consola de los logs para solucionar los warnings
- [ ] Tener un perfil, que se visible públicamente y muestre las estadísticas de las partidas jugadas
- [ ] En el botón de revancha o en la pantalla de resultados debiese estar revancha con subir el nivel de dificultad
- [ ] Que en una feature futura, se vean las salas jugando en este momento, y listar las salas y poder ingresar como espectador a esas salas

## Preguntas

- [ ] Sí elijo la revancha, es el mismo texto o puede ser cualquier otro
- [ ] qué es este fallo "Los tests existentes siguen pasando (el fallo en game.gateway.spec.ts es
      pre-existente)"
- [ ] Debo hacer algo con estos warning: "Build: exitoso. Los warnings son de source-maps de @nestjs/throttler,
      pre-existentes."

# Realizados

### Tareas

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

- [x] Seguridad de la bases de datos, cómo es el tema de las claves, que no las veo, la seguridad en la plataforma
- [x] Seguridad del sistema en general, sí no van a hackear mi vps y consumir mis recursos
- [x] Al ir haciendo mejoras voy Desplegando nuevamente la plataforma, la base de datos, los usuarios que se han registrado se pierden, sus registros se pierden con cada deploy o como es eso?
