import { useEffect } from "react";
export function usePageMotion(route: string) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const watched = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          (target as HTMLElement).dataset.inView = String(isIntersecting);
          if (isIntersecting) (target as HTMLElement).dataset.entered = "true";
        }
      },
      { threshold: 0.08 },
    );
    const observe = () =>
      document
        .querySelectorAll(
          ".landing-section,.bars,.histogram,.split-bar,.members,.hatch",
        )
        .forEach((el) => {
          if (!watched.has(el)) {
            watched.add(el);
            observer.observe(el);
          }
        });
    observe();
    const mutation = new MutationObserver(observe);
    mutation.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, [route]);
}

/** Keep the complete opening in view even when browser zoom leaves a tiny CSS viewport. */
export function useFullscreenHero() {
  useEffect(() => {
    const opening = document.querySelector<HTMLElement>(".landing-opening");
    if (!opening) return;
    let frame = 0;
    let scale = 1;
    let disposed = false;
    const fit = () => {
      if (disposed) return;
      const height = opening.getBoundingClientRect().height;
      if (height > window.innerHeight + 1) {
        scale *= window.innerHeight / height;
        opening.style.setProperty("--hero-fit", String(scale));
        frame = requestAnimationFrame(fit);
      }
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      scale = 1;
      opening.style.setProperty("--hero-fit", "1");
      frame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(opening);
    window.addEventListener("resize", reset);
    window.visualViewport?.addEventListener("resize", reset);
    void document.fonts.ready.then(reset);
    reset();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", reset);
      window.visualViewport?.removeEventListener("resize", reset);
    };
  }, []);
}
