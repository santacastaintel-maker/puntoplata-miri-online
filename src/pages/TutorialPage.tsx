
import { BookOpen, Smartphone, Key, CreditCard, ShieldCheck } from 'lucide-react';

export const TutorialPage = () => {
    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-olivo-500" />
                    Tutorial: Gestión de Andrés Montero Joyería
                </h1>
                <p className="text-slate-500 mt-2 text-lg">
                    Guía completa para instalar la app a tus clientes, generar sus llaves y realizar cobros seguros.
                </p>
            </div>

            <div className="space-y-8">
                {/* Paso 1: Instalación */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-olivo-100 rounded-xl flex items-center justify-center text-olivo-600">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">1. ¿Cómo Instalar la App?</h2>
                    </div>
                    <div className="prose prose-slate max-w-none ml-16">
                        <p>Esta plataforma funciona como una <strong>PWA (Progressive Web App)</strong>. No necesitas tiendas de aplicaciones ni descargas pesadas.</p>
                        <ol className="list-decimal pl-5 space-y-2 mt-4 text-slate-700 font-medium">
                            <li>Abre el enlace de tu joyería en el navegador del cliente (Chrome en Android/PC o Safari en iPhone).</li>
                            <li>Abre el menú del navegador (tres puntos arriba a la derecha).</li>
                            <li>Selecciona la opción <strong>"Añadir a la pantalla de inicio"</strong> o <strong>"Instalar Aplicación"</strong>.</li>
                            <li>¡Listo! El icono de la aplicación aparecerá en su dispositivo como un programa nativo.</li>
                        </ol>
                    </div>
                </section>

                {/* Paso 2: Generar y Entregar Llaves */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <Key className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">2. Módulo de Licencias (Llaves)</h2>
                    </div>
                    <div className="prose prose-slate max-w-none ml-16">
                        <p>Las llaves son tu control de seguridad. Sin ellas, el cliente no puede usar la app.</p>
                        <h4 className="font-bold text-slate-900 mt-4">¿Cómo crear una llave?</h4>
                        <ol className="list-decimal pl-5 space-y-2 mt-2 text-slate-700 font-medium">
                            <li>Entra con tu PIN maestro (9999) al panel de <strong>Administración</strong>.</li>
                            <li>Ve a la pestaña <strong>"Generador de Llaves"</strong>.</li>
                            <li>Escribe el nombre EXACTO del negocio de tu cliente (ej: "Joyería Mari").</li>
                            <li>Selecciona el tipo de licencia: <strong>Mensual</strong> (30 días) o <strong>Vitalicia</strong> (Para siempre).</li>
                            <li>Copia el código gigante que se genera y mándaselo al cliente por WhatsApp.</li>
                        </ol>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-6 rounded-r-lg">
                            <p className="text-sm text-amber-900 m-0">
                                <strong>💡 También tienes el Generador Portátil:</strong> Te he proporcionado un archivo <code>generador_portatil.html</code>. Puedes abrirlo sin internet para sacar llaves en caso de emergencia usando tu "Sal Secreta".
                            </p>
                        </div>
                    </div>
                </section>

                {/* Paso 3: Proceso de Cobro */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-olivo-100 rounded-xl flex items-center justify-center text-olivo-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">3. El Proceso de Cobro Seguro</h2>
                    </div>
                    <div className="prose prose-slate max-w-none ml-16">
                        <p>El sistema está diseñado para que el cobro sea directo contigo, sin comisiones bancarias automáticas, hasta que decidas escalar.</p>
                        <ul className="list-disc pl-5 space-y-3 mt-4 text-slate-700 font-medium tracking-wide">
                            <li><strong>El Aviso Automático:</strong> Cuando falten 5 días para que expire su mes, la app le avisará al cliente.</li>
                            <li><strong>El Trato:</strong> Le aparecerá un botón que dice "Renovar Licencia por WhatsApp" junto a tu CLABE bancaria.</li>
                            <li><strong>El Intercambio Seguro:</strong> El cliente te realiza la transferencia y te manda la foto por WhatsApp.</li>
                            <li><strong>La Reactivación:</strong> Al confirmar el dinero, tú vas a tu Generador, le sacas una llave nueva por otros 30 días y se la envías.</li>
                        </ul>
                    </div>
                </section>

                {/* Paso 4: Seguridad y Anti-Robo */}
                <section className="bg-slate-50 p-6 rounded-2xl shadow-inner border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-700">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">4. ¿Qué pasa si intentan copiarla?</h2>
                    </div>
                    <div className="prose prose-slate max-w-none ml-16">
                        <p className="text-slate-600 mb-4">La seguridad "Fingerprint" protege tu esfuerzo y asegura que cada cliente pague su licencia.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-rose-600 mb-2">Escenario: "Le paso la app a mi compadre"</h4>
                                <p className="text-sm text-slate-700">Si instalan el enlace en la computadora del compadre y usan la misma llave, la app no servirá si intentan cambiar el nombre del comercio. La llave está ligada matemáticamente al nombre.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-rose-600 mb-2">Escenario: "Inventaré mi propia llave"</h4>
                                <p className="text-sm text-slate-700">Sin la <strong>Sal Secreta</strong> (Master Key oculta en el código), nadie en el mundo puede generar una combinación válida. Todo intento de inventar letras al azar será bloqueado al instante.</p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
