import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Producto } from '../types';

/**
 * Redimensiona y comprime una imagen en el lado del cliente usando Canvas.
 * Ideal para procesar fotos antes de subirlas a Supabase Storage.
 * @param file El archivo de imagen original (File o Blob)
 * @param maxWidth Ancho máximo permitido (ej: 800px)
 * @param maxHeight Alto máximo permitido (ej: 800px)
 * @param quality Calidad JPEG (0.0 a 1.0)
 * @returns Promesa que resuelve a un nuevo File optimizado
 */
export const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export const resizeImage = (
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.8
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let width = img.width;
            let height = img.height;

            // Calcular nuevas dimensiones manteniendo la proporción
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No se pudo obtener el contexto del canvas'));
                return;
            }

            // Fondo blanco en caso de transparencia (opcional, para JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // Dibujar la imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);

            // Exportar como JPEG comprimido
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Error al comprimir la imagen.'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al cargar la imagen para redimensionar.'));
        };

        img.src = url;
    });
};

/**
 * Genera un catálogo PDF con los productos dados.
 * @param productos Array de productos a incluir en el PDF
 * @param businessName Nombre del negocio para el encabezado
 */
export const generateCatalogPDF = (productos: Producto[], businessName: string = 'Andrés Montero Joyería') => {
    // Configuración inicial del documento
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Colores y estilos
    const primaryColor = [128, 133, 75]; // Olivo 500
    const textColor = [51, 65, 85];      // Slate 700

    // --- ENCABEZADO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    // Cast necesario para TypeScript con algunas versiones de jsPDF
    (doc as any).setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(businessName, 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    (doc as any).setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Catálogo de Productos - Generado el ${new Date().toLocaleDateString()}`, 14, 28);

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(14, 32, 196, 32);

    // --- TABLA DE DATOS ---
    if (productos.length === 0) {
        doc.setFontSize(14);
        doc.text('No hay productos disponibles para mostrar en el catálogo.', 14, 45);
        doc.save(`Catalogo_${businessName.replace(/\s+/g, '_')}.pdf`);
        return;
    }

    // Preparar filas para la tabla (dejamos un espacio vacío para la imagen)
    const tableData = productos.map(p => [
        '', // Espacio para la imagen
        p.codigo || 'N/A',
        p.nombre,
        p.categorias?.nombre || 'General',
        `$${p.precio.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 38,
        head: [['Foto', 'SKU', 'Producto', 'Categoría', 'Precio']],
        body: tableData,
        theme: 'grid', // Grid mode is better for catalogs
        headStyles: {
            fillColor: [128, 133, 75], // Olivo 500
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            minCellHeight: 30, // Altura mínima para que quepa la imagen
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' }, // Columna Foto
            1: { cellWidth: 20 },
            4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
        },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: [51, 65, 85]
        },
        didDrawCell: (data) => {
            // Renderizar la imagen si estamos en el body de la columna 0 (Foto)
            if (data.row.section === 'body' && data.column.index === 0) {
                const prod = productos[data.row.index];
                if (prod.foto_url) {
                    try {
                        const dim = 24; // Dimensiones de la imagen en mm
                        // Calcular centro de la celda
                        const x = data.cell.x + (data.cell.width - dim) / 2;
                        const y = data.cell.y + (data.cell.height - dim) / 2;

                        // Detectar el formato de la imagen desde el base64
                        let format = 'JPEG';
                        if (prod.foto_url.startsWith('data:image/png')) format = 'PNG';

                        doc.addImage(prod.foto_url, format, x, y, dim, dim);
                    } catch (e) {
                        console.error("Error drawing image in PDF", e);
                    }
                }
            }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate 50
        }
    });

    // --- PIE DE PÁGINA ---
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        (doc as any).setTextColor(148, 163, 184); // Slate 400
        doc.text(
            `Página ${i} de ${pageCount} - Andrés Montero Joyería System`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    // Guardar el PDF
    doc.save(`Catalogo_${businessName.replace(/\s+/g, '_')}.pdf`);
};
