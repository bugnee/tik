"use client";

import { useServerInsertedHTML } from "next/navigation";

const themeInitScript = `(function(){try{var t=localStorage.getItem('tripitkorea-theme');document.documentElement.classList.toggle('dark',t!=='light');document.documentElement.style.colorScheme=t==='light'?'light':'dark';}catch(e){document.documentElement.classList.add('dark');}})();`;

export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script
      id="tripitkorea-theme-init"
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  ));

  return null;
}
