# Cotizador de Salud

Aplicación web para preparar cotizaciones comparativas de Medifé+, Bronce,
Plata y Platinum.

## Funcionalidad

- carga de datos del vendedor y asociado;
- grupo familiar con edades y aportes;
- precios por región, categoría, parentesco y tramo etario;
- ajustes de hijos, segmento joven, filial y promociones;
- comparación de primera cuota y valor desde cuota 13;
- documento imprimible mediante el diálogo PDF del navegador.

## Fuente y alcance

Las tablas fueron trasladadas desde la matriz comercial provisoria de septiembre de 2026. El
archivo Excel original no forma parte del repositorio. El motor conserva un
desglose auditable, pero la aplicación mantiene el estado de validación
pendiente hasta completar la homologación comercial integral.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

El proyecto utiliza Next.js, React y TypeScript y está preparado para
desplegarse en Vercel.
