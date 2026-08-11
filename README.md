# English Test — Práctica por niveles (B1 → D1)

Aplicación web en **React 19 + TypeScript + Vite** para practicar inglés con
tests de opción múltiple. Interfaz construida con **[shadcn/ui](https://ui.shadcn.com)**
(Radix UI + Tailwind CSS), diseño en **colores pastel** y **todo el estilo con
Tailwind** (sin atributos `style` en el HTML).

## ✨ Características

- **Selección de nivel**: B1, B2, C1, C2 y D1.
- **Test de 60 preguntas** elegidas al azar de un _pool_ de **más de 600
  preguntas por nivel** (5 alternativas cada una), para máxima variedad.
- **Temporizador de 1 hora**: el test finaliza al responder todo o al agotarse
  el tiempo.
- **Resultados detallados**: para cada error se muestra la alternativa correcta
  y una **explicación en español** de por qué es la correcta.
- **Memoria de progreso (localStorage)**: las preguntas que ya respondiste
  correctamente no vuelven a aparecer, así siempre practicas material nuevo.
  Puedes reiniciar el progreso de un nivel cuando quieras.

## 🚀 Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # pruebas con Vitest
npm run build      # build de producción (carpeta dist/)
npm run generate   # regenera los pools de preguntas
```

## 🧠 Generación de preguntas

Los pools se generan de forma **determinista** con
[`scripts/generate-questions.mjs`](scripts/generate-questions.mjs) y se guardan
como JSON en `src/data/questions/`. El generador combina plantillas de
gramática (tiempos verbales, comparativos, preposiciones, artículos, modales,
condicionales) y bancos de vocabulario (sinónimos, antónimos, traducciones y
phrasal verbs) por nivel, garantizando que cada pregunta tenga **5 opciones
únicas**, una respuesta correcta válida y una explicación en español.

## 🧪 Pruebas

Se prueban con Vitest la integridad de los pools, la selección aleatoria, la
persistencia en localStorage y los componentes de UI (test, resultados y
selección de nivel), incluido el vencimiento del temporizador.

## 📦 Despliegue

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
compila, ejecuta las pruebas y **despliega en GitHub Pages** en cada push.
El sitio se sirve desde `/English-test/` (configurado en `vite.config.ts`).

> En el repositorio, activa **Settings → Pages → Source: GitHub Actions**.
