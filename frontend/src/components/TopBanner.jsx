export default function TopBanner() {
  return (
    <div className="hidden md:block w-full mb-3 sm:mb-4 overflow-hidden rounded-xl">
      <img
        src="/banner-berkana.png"
        alt="Berkana Agencia de Viajes - Promoción Día de las Madres"
        className="w-full h-auto max-h-[140px] sm:max-h-[180px] object-cover"
        draggable="false"
      />
    </div>
  );
}
