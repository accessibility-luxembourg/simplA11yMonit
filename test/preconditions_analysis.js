() => {
  const form_elts_selector = 'input[type="text"], input[type="password"], input[type="search"], input[type="email"], input[type="number"], input[type="tel"], input[type="url"], textarea, input[type="checkbox"], input[type="radio"], input[type="date"], input[type="range"], input[type="color"], input[type="time"], input[type="month"], input[type="week"], input[type="date-local"], select, datalist, optgroup, option, input[type="file"], output, progress, meter, [role="progressbar"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="listbox"], [role="searchbox"], [role="combobox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]'
  function isImageLink(e) {
    return e.parentNode && e.parentNode.nodeName === 'A' &&
           e.nextElementSibling === null && e.previousElementSibling === null;
  }
  function isVisible(e) {
    const style = window.getComputedStyle(e);
    const rect = e.getBoundingClientRect();
    return style && style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0);
  }
  const imgs = Array.from(document.querySelectorAll(
    'img, [role=\'img\'], area, input[type=\'image\'], svg, ' +
    'object[type=\'image\'], embed[type=\'image\'], canvas'
  ))
  .filter(e => !isImageLink(e))
  .filter(isVisible)
  .length;
  const iframes = document.querySelectorAll('iframe').length;
  const tables = document.querySelectorAll('table, [role=\'table\']').length;
  const formElts = document.querySelectorAll(form_elts_selector).length;
  const result = { img: imgs, iframe: iframes, table: tables, formElts: formElts };
  console.log(result);
  return result;
}