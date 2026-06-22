export default function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 bg-red-500 animate-live-blink" />
      <span className="bg-red-600 text-white text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 leading-none">
        LIVE
      </span>
    </div>
  )
}
