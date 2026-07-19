(function () {
  const list = document.getElementById('admin-reports-list'); if (!list) return;
  let adminReportPage = 1;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  let pagination = document.getElementById('admin-reports-pagination');
  if (!pagination) { pagination = document.createElement('div'); pagination.id='admin-reports-pagination'; pagination.className='admin-catalog-pagination'; list.insertAdjacentElement('afterend',pagination); }

  async function load() {
    const qs = new URLSearchParams({ page:String(adminReportPage), pageSize:'20' });
    const status=document.getElementById('report-status-filter')?.value, target=document.getElementById('report-target-filter')?.value;
    if(status)qs.set('status',status);if(target)qs.set('targetType',target);
    const response=await fetch('/api/reports?'+qs,{credentials:'same-origin'});if(!response.ok){list.textContent='Không thể tải báo cáo.';return;}
    const data=await response.json(), items=data.items||[]; adminReportPage=data.page||1;
    list.innerHTML=items.length?items.map(x=>`<article class="glass-card" style="padding:16px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${esc(x.targetType==='Chapter'?x.chapterTitle||`Chapter #${x.chapterId}`:x.mangaTitle||`Manga #${x.mangaId}`)}</strong><span>${esc(x.status)}</span></div><p style="margin:8px 0">${esc(x.reason)}</p>${x.explanation?`<small>${esc(x.explanation)}</small>`:''}<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><small>Bởi ${esc(x.reporter)}</small>${x.status==='Pending'?`<span><button data-report-action="Resolved" data-report-id="${x.id}">Đã xử lý</button> <button data-report-action="Dismissed" data-report-id="${x.id}">Bỏ qua</button></span>`:''}</div></article>`).join(''):'<p>Chưa có báo cáo.</p>';
    renderPagination(data.totalPages||1);
    list.querySelectorAll('[data-report-action]').forEach(button=>button.onclick=async()=>{const result=await fetch('/api/reports/'+button.dataset.reportId,{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:button.dataset.reportAction})});if(result.ok)load();});
  }
  function renderPagination(totalPages){ if(totalPages<=1){pagination.innerHTML='';return;}const pages=[];for(let p=Math.max(1,adminReportPage-2);p<=Math.min(totalPages,adminReportPage+2);p++)pages.push(p);pagination.innerHTML=`<button data-page="${adminReportPage-1}" ${adminReportPage===1?'disabled':''}>‹</button>${pages.map(p=>`<button data-page="${p}" class="${p===adminReportPage?'active':''}">${p}</button>`).join('')}<button data-page="${adminReportPage+1}" ${adminReportPage===totalPages?'disabled':''}>›</button>`;pagination.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{const page=Number(button.dataset.page);if(page>=1&&page<=totalPages&&page!==adminReportPage){adminReportPage=page;load();}}); }
  document.getElementById('report-status-filter')?.addEventListener('change',()=>{adminReportPage=1;load();});
  document.getElementById('report-target-filter')?.addEventListener('change',()=>{adminReportPage=1;load();});
  load();
})();
