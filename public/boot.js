// Runs before paint: marks JS as available so reveal styles apply, and skips the long intro on repeat visits.
(function(){var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('sbs-seen'))d.classList.add('seen');sessionStorage.setItem('sbs-seen','1')}catch(e){}if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('rm')})();
