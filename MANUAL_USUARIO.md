# 💎 Manual de Usuario: Andrés Montero Joyería (PUNTOPLATA)

¡Bienvenido al sistema de gestión y punto de venta diseñado exclusivamente para el mercado de joyería premium! Este manual te guiará paso a paso para dominar todas las funciones del sistema, desde la instalación hasta la gestión avanzada de inventarios.

---

## 📖 Contenido
1. [Introducción y Filosofía](#1-introducción-y-filosofía)
2. [Instalación (PWA)](#2-instalación-pwa)
3. [Seguridad y Activación (Llaves)](#3-seguridad-y-activación-llaves)
4. [Módulo de Ventas (Punto de Venta)](#4-módulo-de-ventas-punto-de-venta)
5. [Gestión de Inventario](#5-gestión-de-inventario)
6. [Gestión de Clientes](#6-gestión-de-clientes)
7. [Panel de Administración y Configuración](#7-panel-de-administración-y-configuración)
8. [Herramientas Élite y Respaldos](#8-herramientas-élite-y-respaldos)

---

## 1. Introducción y Filosofía
El sistema **PUNTOPLATA** está construido bajo la arquitectura *Offline-First*. Esto significa que la aplicación vive en tu dispositivo y no depende de internet para funcionar durante el día a día. 

- **Privacidad Total**: Tus datos de ventas y clientes nunca salen de tu dispositivo a menos que tú decidas exportarlos.
- **Rapidez**: Al no esperar respuesta de un servidor externo, la app es instantánea.
- **Independencia**: Tú controlas las licencias y el acceso de tu personal.

---

## 2. Instalación (PWA)
Esta aplicación no se descarga de una tienda tradicional (App Store o Play Store). Se instala directamente desde el navegador como una **PWA (Progressive Web App)**.

### En iPhone (Safari):
1. Abre el enlace de la aplicación.
2. Toca el botón de **"Compartir"** (el cuadrado con la flecha hacia arriba).
3. Desliza hacia abajo y selecciona **"Añadir a pantalla de inicio"**.
4. ¡Listo! El icono aparecerá junto a tus otras apps.

### En Android (Chrome):
1. Abre el enlace.
2. Toca los **tres puntos** arriba a la derecha.
3. Selecciona **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.

### En Computadora (Chrome/Edge):
1. Verás un icono de una pantalla con una flecha en la barra de direcciones.
2. Haz clic en **"Instalar"**.

---

## 3. Seguridad y Activación (Llaves)
Para proteger tu negocio, el sistema requiere una **Llave de Activación** única ligada al nombre de tu joyería.

1. **Nombre del Negocio**: Debe escribirse exactamente como se generó la llave.
2. **Llave (Key)**: Es un código alfanumérico largo.
3. **Tipos de Licencia**:
   - **Mensual**: Expira a los 30 días. El sistema avisará al usuario 5 días antes de vencer.
   - **Vitalicia**: El acceso es permanente para ese dispositivo.

> [!TIP]
> Si no tienes acceso al administrador en línea, puedes usar el **Generador Portátil** (`generador_portatil.html`) que funciona incluso sin internet.

---

## 4. Módulo de Ventas (Punto de Venta)
Es el corazón de la operación diaria.

### Pasos para realizar una venta:
1. **Identificar Productos**: 
   - Usa un escáner de códigos de barras (enfocando el campo "Escanear producto").
   - Busca manualmente por nombre o código en el catálogo.
2. **Gestionar Carrito**: Puedes aumentar o disminuir cantidades directamente en la lista.
3. **Seleccionar Cliente**: 
   - **Cliente Frecuente**: Búscalo por nombre en el directorio.
   - **Cliente Ocasional**: Úsalo para ventas rápidas a turistas o personas que no desean dejar sus datos.
4. **Aplicar Descuento**:
   - Los vendedores tienen un límite (ej. 15%) configurado por el administrador.
   - Sólo el administrador puede aplicar descuentos mayores ingresando con su PIN.
5. **Método de Pago**:
   - **Efectivo/Tarjeta**: Registro simple.
   - **Transferencia**: La app mostrará tus datos bancarios (CLABE) y permitirá compartirlos por WhatsApp al cliente en un clic.
6. **Finalizar y Recibo**: Al completar la venta, pulsa **"Enviar Recibo"** para generar un mensaje automático de WhatsApp con el folio y el total de la compra.

---

## 5. Gestión de Inventario
Ubicado en el panel de **Administración > Inventario**.

- **Carga Masiva**: Puedes importar productos desde un archivo de Excel.
- **Fotografías**: Sube fotos directamente desde la cámara de tu celular o iPad.
- **Precios**: Define el precio de venta. Recuerda que puedes usar el **Multiplicador Masivo** si el precio de la plata sube globalmente.
- **Categorías**: Organiza por anillos, cadenas, pulseras, etc., para facilitar la búsqueda.

---

## 6. Gestión de Clientes
Lleva un registro de quiénes son tus mejores compradores.

- **Directorio**: Consulta teléfonos y notas de cada cliente.
- **Historial**: El sistema guarda qué ha comprado cada persona para ofrecer un trato personalizado.
- **Notas**: Anota preferencias (ej. "Le gustan las piedras azules" o "Talla 7").

---

## 7. Panel de Administración y Configuración
Accede con el PIN Maestro (por defecto `9999`).

### Pestañas clave:
- **Personal**: Crea accesos para tus vendedores con sus propios PINs.
- **Seguridad**: Cambia tu PIN maestro periódicamente.
- **Configuración de Cobro**: Aquí defines el nombre del banco, titular y CLABE que se mostrará a los clientes al pagar por transferencia.
- **Límites**: Define el descuento máximo que tus empleados pueden otorgar sin tu permiso.

---

## 8. Herramientas Élite y Respaldos
Diseñadas para situaciones de cambio de precios o mantenimiento.

### Multiplicador Masivo
Si el precio de la plata sube, no cambies uno por uno. Ve a **Herramientas > Multiplicar Precios Gral.**, ingresa el factor (ej: `1.10` para un 10%) y todos tus precios se actualizarán al instante.

### Copias de Seguridad (Backups)
> [!IMPORTANT]
> Al ser un sistema offline, tus datos están en tu dispositivo. **Es vital descargar un respaldo al menos una vez por semana.**

1. Ve a **Herramientas > Descargar Copia de Seguridad**.
2. Se descargará un archivo `.ppdata`.
3. Guarda este archivo en tu correo o en una USB.
4. Si pierdes tu celular, instala la app en uno nuevo y usa **"Restaurar desde archivo"** para recuperar toda tu información en segundos.

---

*Desarrollado para la excelencia en joyería.*
*Andrés Montero Joyería © 2026*
