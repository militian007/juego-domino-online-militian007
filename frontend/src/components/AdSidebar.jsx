export default function AdSidebar() {
  const handleClick = () => {
    window.open('https://privoytruco.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="w-full flex items-start justify-center cursor-pointer"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
    >
      <img
        src="/banner-publicidad.webp"
        alt="Club de Truco Premier - Publicidad"
        className="w-full h-auto object-contain rounded-lg border border-slate-700/70"
        draggable="false"
      />
    </div>
  );
}
