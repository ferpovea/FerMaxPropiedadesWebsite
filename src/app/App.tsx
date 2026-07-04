import React, { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { Building2, Home, Key, Phone, Mail, MapPin, CircleDollarSign, ExternalLink, Globe, Search, Plus, Minus, RotateCcw } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

function resolveAssetUrl(path: string) {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  const base = (import.meta.env.VITE_ASSETS_URL || import.meta.env.BASE_URL || "/").toString();
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${cleanBase}${cleanPath}`;
}

const logoUrl = resolveAssetUrl("/images/logotransparente.png");
const testEnable = import.meta.env.VITE_TEST_ENABLE === "true";
const whatsappUrl = import.meta.env.VITE_WHATSAPP_URL || "https://wa.me/56900000000";

type Propiedad = {
  id: string;
  titulo: string;
  detalle: string;
  mts2: string;
  imagen: string;
  mapEmbedUrl?: string;
  youtubeEmbedUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;   // <-- corregido
  portalUrl?: string;
  comuna?: string;
  precio?: string;
  tipo?: string;
  estado?: string;
  test?: string;
  fin?: boolean;
  imagenes?: string;
  destacada?: boolean;
};


// Limpia cualquier URL/ID y devuelve un embed seguro SIN ?si=...
function getCleanYouTubeEmbed(idOrUrl: string): string | null {
  try {
    // Si ya viene solo el ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(idOrUrl)) {
      return `https://www.youtube.com/embed/${idOrUrl}`;
    }

    const u = new URL(idOrUrl);

    // youtu.be/ID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
      return null;
    }

    // youtube.com/watch?v=ID
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return `https://www.youtube.com/embed/${v}`;

      // youtube.com/embed/ID (limpia query)
      const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
  } catch {
    // Si no es URL, intenta extraer ID desde texto
    const m = idOrUrl.match(/([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }

  return null;
}

export default function App() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const base = import.meta.env.VITE_ASSETS_URL;
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerScale, setViewerScale] = useState(1);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const nextImage = (id: string, total: number) => {
    setCarouselIndex((prev) => ({
      ...prev,
      [id]: ((prev[id] ?? 0) + 1) % total,
    }));
  };

  const prevImage = (id: string, total: number) => {
    setCarouselIndex((prev) => ({
      ...prev,
      [id]: ((prev[id] ?? 0) - 1 + total) % total,
    }));
  };
  useEffect(() => {
    const load = async () => {
      try {
        setPropLoading(true);

        // Importante: si NO tienes env, esto revienta.
        // Asegúrate que existen en .env y que estás en Vite.
        const baseUrl = import.meta.env.VITE_SHEETS_API_URL as string | undefined;
        const apiKey = import.meta.env.VITE_SHEETS_API_KEY as string | undefined;

        if (!baseUrl) throw new Error("Falta VITE_SHEETS_API_URL en .env");
        if (!apiKey) throw new Error("Falta VITE_SHEETS_API_KEY en .env");

        const url = `${baseUrl}?key=${apiKey}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Error cargando propiedades");
        const data = await resp.json();

        // Si tu API devuelve {data: [...]}, cambia a setPropiedades(data.data)
        setPropiedades(Array.isArray(data) ? data : data?.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setPropLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!viewerOpen) {
      setViewerScale(1);
      setViewerOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [viewerOpen]);

  useEffect(() => {
    const header = document.getElementById("header");

    const onScroll = () => {
      if (!header) return;

      if (window.scrollY > 40) {
        header.classList.add(
          "shadow-xl",
          "bg-white/95",
          "scale-[0.97]"
        );
      } else {
        header.classList.remove(
          "shadow-xl",
          "bg-white/95",
          "scale-[0.97]"
        );
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };



  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!formRef.current) return;
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setLoading(false);
      setMessage("Falta configuración de EmailJS en variables de entorno.");
      return;
    }
    emailjs
      .sendForm(
        serviceId,
        templateId,
        formRef.current,
        publicKey
      )
      .then(
        (result) => {
          console.log("SUCCESS!", result.text);
          setMessage("¡Mensaje enviado con éxito! Gracias por contactarnos.");
          formRef.current?.reset();
        },
        (error) => {
          console.log("FAILED...", error.text);
          setMessage("Error al enviar. Intenta nuevamente.");
        }
      )
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    formRef.current?.reset();
    setMessage("");
  };

  const propiedadesFiltradas = propiedades.filter((p) => {
    const isTest = String(p.test).toLowerCase() === "true";

    if (testEnable) {
      return isTest; // mostrar solo las de test
    }

    return !isTest; // ocultar las de test
  });
  return (
    <div className="min-h-screen bg-white relative">
      {/* Fixed Background Image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${resolveAssetUrl("/images/fondo.webp")})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}

      />
      {/* Fixed Overlay */}

      {/* Navigation */}
      <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center">
        <div
          id="header"
          className="w-full max-w-7xl mx-4
               bg-white/85 backdrop-blur-md
               border border-gray-200/60
               rounded-2xl
               shadow-lg
               transition-all duration-300 ease-out"
        >
          <div className="flex items-center justify-between h-16 px-6">
            {/* Logo */}
            <ImageWithFallback
              src={logoUrl}
              alt="FerMax Propiedades"
              className="h-8 w-auto"
              width={120}
              height={32}
              loading="eager"
              decoding="async"
            />

            {/* Menu */}
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-700">
              <button
                onClick={() => scrollToSection("inicio")}
                className="relative text-gray-700 hover:text-primary transition-colors
             after:absolute after:left-0 after:-bottom-1
             after:h-[2px] after:w-0 after:bg-primary
             hover:after:w-full after:transition-all after:duration-300"
              >
                Inicio
              </button>
              <button
                onClick={() => scrollToSection("servicios")}
                className="relative text-gray-700 hover:text-primary transition-colors
             after:absolute after:left-0 after:-bottom-1
             after:h-[2px] after:w-0 after:bg-primary
             hover:after:w-full after:transition-all after:duration-300"
              >
                Servicios
              </button>
              <button
                onClick={() => scrollToSection("propiedades")}
                className="relative text-gray-700 hover:text-primary transition-colors
             after:absolute after:left-0 after:-bottom-1
             after:h-[2px] after:w-0 after:bg-primary
             hover:after:w-full after:transition-all after:duration-300"
              >
                Propiedades
              </button>
              <button
                onClick={() => scrollToSection("nosotros")}
                className="relative text-gray-700 hover:text-primary transition-colors
             after:absolute after:left-0 after:-bottom-1
             after:h-[2px] after:w-0 after:bg-primary
             hover:after:w-full after:transition-all after:duration-300"
              >
                Nosotros
              </button>
              <button
                onClick={() => scrollToSection("contacto")}
                className="relative text-gray-700 hover:text-primary transition-colors
             after:absolute after:left-0 after:-bottom-1
             after:h-[2px] after:w-0 after:bg-primary
             hover:after:w-full after:transition-all after:duration-300"
              >
                Contacto
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={() => scrollToSection("contacto")}
              className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold shadow hover:bg-primary/90 transition"
            >
              Consultar
            </button>
          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <section
        id="inicio"
        className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        {/* Fondo */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/images/hero-fondo.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(3px)",
            transform: "scale(1.08)",
          }}
        />
        <div className="absolute inset-0 bg-white/60 z-0" />


        {/* Contenido */}
        <div className="relative z-10 flex justify-center">
          <div className="w-full max-w-4xl bg-white/60 rounded-3xl border border-gray-200/60 shadow-xl backdrop-blur-[2px] px-10 py-14 text-center">

            <ImageWithFallback
              src={logoUrl}
              alt="FerMax Propiedades"
              className="h-44 mx-auto mb-10 drop-shadow-sm w-auto"
              width={320}
              height={176}
              loading="eager"
              decoding="async"
            />

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 text-primary tracking-tight">
              Corretaje inmobiliario confiable
            </h1>

            <p className="text-xl sm:text-2xl text-gray-700 mb-6 font-semibold tracking-wide">
              Compra · Venta · Arriendo
            </p>

            <p className="text-base sm:text-lg text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
              Acompañamiento experto, procesos claros y gestión completa de tu propiedad.
            </p>

            <button
              onClick={() => scrollToSection("propiedades")}
              className="bg-primary text-white px-10 py-4 rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all transform hover:scale-[1.03]"
            >
              Ver Propiedades
            </button>

          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="servicios"
        className="py-20 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] -z-10" />
        <div className="max-w-7xl mx-auto">

          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-6 sm:p-10 shadow-xl">
            <h2 className="text-3xl sm:text-4xl text-center mb-10 text-primary font-semibold tracking-tight">
              Nuestros Servicios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

              {/* Compra y Venta */}
              <button type="button"
                //href="#contacto?servicio=compra-venta"
                onClick={() => scrollToSection("contacto")}
                className="group w-full text-left bg-white/85 backdrop-blur-sm border border-gray-200/60
rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1
focus:outline-none focus:ring-2 focus:ring-primary p-8"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary/15 transition-colors">
                  <Home className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl text-center mb-4 text-primary font-semibold">
                  Compra y Venta
                </h3>
                <p className="text-gray-600 text-center">
                  Asesoría integral para la compra y venta de propiedades residenciales y comerciales en Santiago.
                </p>
                <p className="mt-3 text-sm text-primary font-medium text-center">
                  Contáctanos para una asesoría personalizada.
                </p>
              </button>

              {/* Arriendo */}
              <button type="button"
                onClick={() => scrollToSection("contacto")}
                className="group w-full text-left bg-white/85 backdrop-blur-sm border border-gray-200/60
rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1
focus:outline-none focus:ring-2 focus:ring-primary p-8"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary/15 transition-colors">
                  <Key className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl text-center mb-4 text-primary font-semibold">
                  Arriendo
                </h3>
                <p className="text-gray-600 text-center">
                  Gestión completa de arriendos con búsqueda personalizada y trámites incluidos.
                </p>
                <p className="mt-3 text-sm text-primary font-medium text-center">
                  Gestionamos tu arriendo de principio a fin.
                </p>
              </button>

              {/* Propiedades Comerciales */}
              <button type="button"
                onClick={() => scrollToSection("contacto")}
                className="group w-full text-left bg-white/85 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary p-8"              >

                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary/15 transition-colors">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl text-center mb-4 text-primary font-semibold">
                  Propiedades Comerciales
                </h3>
                <p className="text-gray-600 text-center">
                  Especialistas en espacios comerciales, oficinas y locales de negocio.
                </p>
                <p className="mt-3 text-sm text-primary font-medium text-center">
                  Cuéntanos tu proyecto comercial.
                </p>
              </button>

              {/* Tasación */}
              <button type="button"
                onClick={() => scrollToSection("contacto")}
                className="group w-full text-left bg-white/85 backdrop-blur-sm border border-gray-200/60
rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1
focus:outline-none focus:ring-2 focus:ring-primary p-8"
              >

                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary/15 transition-colors">
                  <CircleDollarSign className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl text-center mb-4 text-primary font-semibold">
                  Tasación Comercial
                </h3>
                <p className="text-gray-600 text-center">
                  Apoyo en determinar el valor comercial de un inmueble, considerando ubicación, superficie, estado y entorno.
                </p>
                <p className="mt-3 text-sm text-primary font-medium text-center">
                  Solicita una valorización orientativa.
                </p>
              </button>

            </div>
          </div>
        </div>
      </section>


      {/* Properties Section */}

      <section id="propiedades" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] -z-10" />
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-3xl p-6 sm:p-10 shadow-xl" >


            <div className="text-center mb-10">

              <h2 className="text-3xl sm:text-4xl text-center mb-10 text-primary font-semibold tracking-tight">
                Propiedades
              </h2>
              <p className="mt-3 text-gray-700">
                Explora opciones en venta y arriendo en Santiago y alrededores.
              </p>
              {!propLoading && (
                <p className="mt-2 text-sm text-gray-600">
                  Mostrando <span className="font-semibold">{propiedadesFiltradas.length}</span>{" "}
                  {propiedadesFiltradas.length === 1 ? "propiedad" : "propiedades"}.
                </p>
              )}
            </div>


            {propLoading && (
              <p className="text-center text-gray-600 mb-8">Cargando propiedades…</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {propiedadesFiltradas.map((p) => {
                const raw = (p.youtubeEmbedUrl ?? "").trim();
                const embedSrc = raw ? getCleanYouTubeEmbed(raw) : null;

                return (
                  <div
                    key={p.id}
                    className={`relative bg-white/85 backdrop-blur-sm border rounded-2xl shadow-lg overflow-hidden
    transition-all hover:-translate-y-1 hover:shadow-xl h-full flex flex-col
    ${p.destacada ? "border-primary/50 shadow-xl" : "border-gray-200/60"}
  `}
                  >
                    {p.destacada && (
                      <span
                        className="absolute top-3 left-3 z-10
                 bg-primary text-white
                 text-xs font-semibold uppercase
                 px-3 py-1 rounded-full
                 shadow-md tracking-wide"
                      >
                        Destacada
                      </span>
                    )}

                    {(() => {
                      const imgs = p.imagenes
                        ? p.imagenes
                          .split(",")
                          .map((i) => `${base}${i.trim()}`)
                        : [`${base}${p.imagen}`];

                      const index = carouselIndex[p.id] ?? 0;

                      return (
                        <div className="relative w-full h-72 md:h-80 overflow-hidden">
                          <ImageWithFallback
                            src={imgs[index]}
                            alt={p.titulo}
                            className="w-full h-full object-cover cursor-pointer"
                            loading="lazy"
                            decoding="async"
                            onClick={() => {
                              setViewerImages(imgs);
                              setViewerIndex(index);
                              setViewerScale(1);
                              setViewerOffset({ x: 0, y: 0 });
                              setViewerOpen(true);
                            }}
                          />
                          {p.fin?.toLowerCase().includes("true") && (
                            <div
                              className="absolute inset-0 flex items-center justify-center
      pointer-events-none"
                            >
                              <div
                                className="bg-red-600/90 text-white
      text-2xl font-bold uppercase
      px-8 py-3 rounded-lg
      rotate-[-18deg]
      shadow-2xl tracking-widest"
                              >
                                {p.estado?.toLowerCase().includes("arriendo") 
                                  ? "ARRENDADA"
                                  : "VENDIDA"}
                              </div>
                            </div>
                          )}
                          {imgs.length > 1 && (
                            <>
                              {/* Botón anterior */}
                              <button
                                onClick={() => prevImage(p.id, imgs.length)}
                                className="absolute left-2 top-1/2 -translate-y-1/2
            bg-black/40 text-white px-2 py-1 rounded"
                              >
                                ‹
                              </button>

                              {/* Botón siguiente */}
                              <button
                                onClick={() => nextImage(p.id, imgs.length)}
                                className="absolute right-2 top-1/2 -translate-y-1/2
            bg-black/40 text-white px-2 py-1 rounded"
                              >
                                ›
                              </button>
                            </>
                          )}
                          <p className="text-xs">{imgs[index]}</p>
                        </div>
                      );
                    })()}

                    <div className="p-6">
                      <h3
                        className={`font-semibold text-primary leading-snug mb-2
    ${p.destacada ? "text-xl" : "text-lg"}
  `}
                      >
                        {p.titulo}
                      </h3>


                      <div className="text-secondary text-sm mb-2">
                        {p.detalle && (
                          <p className="whitespace-pre-line">• {p.detalle}</p>
                        )}
                        <br />
                        {p.comuna && (
                          <p>• {p.comuna}</p>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm">• {p.mts2}</p>

                      {(p.precio || p.estado) && (
                        <p className="text-gray-700 text-sm mt-2 whitespace-pre-line">
                          {p.estado ? `• ${p.estado}` : ""}
                          {p.precio ? `${p.precio}` : ""}
                        </p>
                      )}
                    </div>


                    {embedSrc && (
                      <div className="p-4 pt-0">
                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black/5">
                          <iframe
                            title={`Video ${p.titulo}`}
                            src={embedSrc}
                            className="w-full h-full"
                            style={{ border: 0 }}
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}



                    {raw && !embedSrc && (
                      <div className="p-4 pt-0">
                        <p className="text-sm text-red-600">
                          No se pudo generar el embed desde youtubeEmbedUrl (formato no reconocido).
                        </p>
                      </div>
                    )}

                    {/* Mapa */}
                    {p.mapEmbedUrl && (
                      <div className="p-4">
                        <iframe
                          title={`Mapa ${p.titulo}`}
                          src={p.mapEmbedUrl}
                          className="w-full h-80 rounded-xl"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Redes */}
                    {p.tiktokUrl && (
                      <div className="p-4">
                        <a
                          href={p.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <FaTiktok className="w-4 h-4" />
                          <span>Ver publicación en TikTok</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    )}

                    {p.facebookUrl && (
                      <div className="p-4">
                        <a
                          href={p.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <FaFacebook className="w-4 h-4" />
                          <span>Ver publicación en Facebook</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    )}

                    {p.instagramUrl && (
                      <div className="p-4">
                        <a
                          href={p.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <FaInstagram className="w-4 h-4" />
                          <span>Ver publicación en Instagram</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    )}

                    {p.portalUrl && (
                      <div className="p-4">
                        <a
                          href={p.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Ver publicación en Portal Inmobiliario</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </section>

      {/* About Section */}
      <section id="nosotros" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Overlay suave */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] -z-10" />

        <div className="max-w-5xl mx-auto">
          <div className="bg-white/55 backdrop-blur-sm border border-gray-200/60 rounded-3xl shadow-xl px-8 sm:px-12 py-12 sm:py-14 text-center">
            <h2 className="text-3xl sm:text-4xl text-primary font-semibold tracking-tight mb-6">
              Sobre Nosotros
            </h2>

            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
              En FerMax Propiedades contamos con un equipo experimentado en el mercado inmobiliario chileno,
              comprometido con brindar un servicio profesional y personalizado a cada cliente.
            </p>

            <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Nuestra experiencia en Santiago nos permite ofrecer oportunidades tanto en propiedades residenciales
              como comerciales, garantizando transparencia y confianza en cada transacción.
            </p>


            {/* CTA suave */}
            <div className="mt-10">
              <button
                type="button"
                onClick={() => scrollToSection("contacto")}
                className="inline-flex items-center justify-center bg-primary text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all"
              >
                Habla con nosotros
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* Contact Section */}
      <section id="contacto" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-3xl shadow-xl p-6 sm:p-10">
            <h2 className="text-3xl sm:text-4xl text-center mb-12 text-primary font-semibold">
              Contáctanos
            </h2>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

              <div className="bg-white/90 border border-gray-200/60 rounded-2xl p-6 shadow-md">
                <form ref={formRef} onSubmit={sendEmail} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm mb-2 text-gray-700">
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="from_name"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm mb-2 text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="from_email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm mb-2 text-gray-700">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone_number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div>
                    <label htmlFor="service" className="block text-sm mb-2 text-gray-700">
                      Servicio de interés
                    </label>
                    <select
                      id="service"
                      name="service"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecciona un servicio
                      </option>
                      <option value="Venta de propiedades">Venta de propiedades</option>
                      <option value="Arriendo de propiedades">Arriendo de propiedades</option>
                      <option value="Tasación de propiedad">Tasación de propiedad</option>
                      <option value="Asesoría inmobiliaria">Asesoría inmobiliaria</option>
                      <option value="Administración de arriendos">Administración de arriendos</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm mb-2 text-gray-700">
                      Mensaje
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
                  >
                    {loading ? "Enviando..." : "Enviar Mensaje"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar Formulario
                  </button>

                  {message && (
                    <p className={`text-sm mt-2 ${message.includes("éxito") ? "text-green-600" : "text-red-600"}`}>
                      {message}
                    </p>
                  )}
                </form>
              </div>

              <div className="space-y-6">
                <div className="bg-white/90 border border-gray-200/60 rounded-2xl p-6 shadow-md h-fit">
                  <h3 className="mb-4 text-primary font-semibold text-lg">
                    Información de Contacto
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <p className="text-gray-700">+56 9 7784 7214</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <p className="text-gray-700">contacto@fermaxpropiedades.cl</p>
                      </div>
                    </div>
                    {/*<div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1" />
                    <p className="text-gray-700">
                      Av. Providencia 1234, Oficina 56
                      <br />
                      Santiago, Chile
                    </p>
                  </div>*/}
                  </div>
                </div>

                {/*
              <div className="bg-gray-200 rounded-lg overflow-hidden shadow-md h-64">
                <iframe
                  title="Mapa de Santiago"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106494.64850297135!2d-70.7249683!3d-33.447487!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662c5a5f0a7e7ff%3A0x8475d53c400f0931!2sSantiago%2C%20Regi%C3%B3n%20Metropolitana%2C%20Chile!5e0!3m2!1ses!2sus!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              */}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-primary text-white py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <ImageWithFallback
            src={logoUrl}
            alt="FerMax Propiedades"
            className="h-12 mx-auto mb-4 brightness-0 invert w-auto"
            width={160}
            height={48}
            loading="eager"
            decoding="async"
          />
          <p className="text-sm opacity-90">© 2026 FerMax Propiedades. Todos los derechos reservados.</p>
        </div>
      </footer>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.35)] transition hover:scale-105 hover:bg-[#1DA851]"
      >
        <FaWhatsapp className="h-7 w-7" />
      </a>

      {viewerOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-hidden overscroll-contain"
          onClick={() => setViewerOpen(false)}
          onWheelCapture={(e) => {
            if (e.ctrlKey) return;
            e.preventDefault();
            e.stopPropagation();

            setViewerScale((scale) => {
              const delta = e.deltaY > 0 ? -0.25 : 0.25;
              const next = Math.max(1, Math.min(3, Number((scale + delta).toFixed(2))));
              if (next === 1) {
                setViewerOffset({ x: 0, y: 0 });
              }
              return next === scale ? scale : next;
            });
          }}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="overflow-hidden max-h-[85vh] rounded-xl bg-black/10 p-2 sm:p-4"
              style={{ touchAction: 'none' }}
              onWheel={(e) => {
                e.preventDefault();
                if (e.ctrlKey) return;

                setViewerScale((scale) => {
                  const delta = e.deltaY > 0 ? -0.25 : 0.25;
                  const next = Math.max(1, Math.min(3, Number((scale + delta).toFixed(2))));
                  if (next === 1) {
                    setViewerOffset({ x: 0, y: 0 });
                  }
                  return next === scale ? scale : next;
                });
              }}
              onPointerDown={(e) => {
                if (viewerScale > 1 && (e.button === 0 || e.pointerType === 'touch')) {
                  e.preventDefault();
                  setIsDragging(true);
                  dragStart.current = { x: e.clientX - viewerOffset.x, y: e.clientY - viewerOffset.y };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }
              }}
              onPointerMove={(e) => {
                if (!isDragging || viewerScale <= 1) return;
                setViewerOffset({
                  x: e.clientX - dragStart.current.x,
                  y: e.clientY - dragStart.current.y,
                });
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                setIsDragging(false);
              }}
              onPointerCancel={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                setIsDragging(false);
              }}
              onPointerLeave={() => setIsDragging(false)}
            >
              <div
                className="flex min-h-[60vh] items-center justify-center"
                style={{ cursor: viewerScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              >
                <ImageWithFallback
                  src={viewerImages[viewerIndex]}
                  className="max-w-full max-h-[75vh] h-auto object-contain rounded-xl mx-auto transition-transform duration-200"
                  alt="Vista ampliada de propiedad"
                  loading="eager"
                  decoding="async"
                  style={{
                    transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerScale})`,
                    transformOrigin: 'center center',
                    maxWidth: '100%',
                    maxHeight: '75vh',
                  }}
                />
              </div>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 p-2 backdrop-blur-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerScale((scale) => {
                    const next = Math.min(3, Number((scale + 0.25).toFixed(2)));
                    if (next === scale) return scale;
                    setViewerOffset({ x: 0, y: 0 });
                    return next;
                  });
                }}
                className="rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white"
                aria-label="Acercar"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerScale((scale) => {
                    const next = Math.max(1, Number((scale - 0.25).toFixed(2)));
                    if (next === scale) return scale;
                    if (next === 1) setViewerOffset({ x: 0, y: 0 });
                    return next;
                  });
                }}
                className="rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white"
                aria-label="Alejar"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerScale(1);
                  setViewerOffset({ x: 0, y: 0 });
                }}
                className="rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white"
                aria-label="Restablecer zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerOpen(false);
                }}
                className="rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white"
                aria-label="Cerrar vista ampliada"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>

            {viewerImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((viewerIndex - 1 + viewerImages.length) % viewerImages.length);
                    setViewerScale(1);
                    setViewerOffset({ x: 0, y: 0 });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow hover:bg-black/70"
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((viewerIndex + 1) % viewerImages.length);
                    setViewerScale(1);
                    setViewerOffset({ x: 0, y: 0 });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow hover:bg-black/70"
                  aria-label="Imagen siguiente"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
