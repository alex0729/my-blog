// 다크 모드 토글. 첫 적용은 <head> 인라인 스크립트가 담당, 여기는 클릭 처리만.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-toggle');
  if (!button) return;

  function current() {
    return root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function sync() {
    button.setAttribute('aria-pressed', String(current() === 'dark'));
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  });

  sync();
})();
