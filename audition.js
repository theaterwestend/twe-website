(function() {

  // ─── CONFIG (set by Squarespace code block) ───────
  var cfg                  = window.TWE_CONFIG || {};
  var AUDITION_RECORD_ID   = cfg.auditionRecordId;
  var PRODUCTION_RECORD_ID = cfg.productionRecordId;
  var BASE_ID              = cfg.baseId;
  var AUDITION_TABLE_ID    = cfg.auditionTableId;
  var PRODUCTION_TABLE_ID  = cfg.productionTableId;
  var API_KEY              = cfg.apiKey;
  // ──────────────────────────────────────────────────

  function isDraft(status) {
    return !status || status.toLowerCase().indexOf('draft') !== -1;
  }

  function stripMd(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
  }

  function mdToHtml(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ebebeb;margin:1.5rem 0;">')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n\n/g, '</p><p>');
  }

  function wrapP(html) {
    if (!html) return '';
    if (html.trim().startsWith('<')) return html;
    return '<p>' + html + '</p>';
  }

  function parseLocalDate(iso) {
    if (!iso) return null;
    var parts = iso.split('T')[0].split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = parseLocalDate(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatShowDates(start, closing) {
    if (!start && !closing) return 'TBD';
    var s = parseLocalDate(start);
    var e = parseLocalDate(closing);
    var opts = { month: 'long', day: 'numeric' };
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.toLocaleDateString('en-US', opts) + '\u2013' + e.getDate() + ', ' + e.getFullYear();
    }
    return s.toLocaleDateString('en-US', opts) + ' \u2013 ' + e.toLocaleDateString('en-US', opts) + ', ' + e.getFullYear();
  }

  function parseCharacters(text) {
    var chars = [];
    var regex = /\*\*([A-ZÄÖÜc4d6dc][^\*]+)\*\*\s*_\((.+?)\)_\n([\s\S]+?)(?=\n\n\*\*|\n\n---|\n\n_The director|$)/g;
    var m;
    while ((m = regex.exec(text)) !== null) {
      var name = m[1].trim();
      var meta = m[2].trim();
      var body = m[3].trim();
      var songMatch = body.match(/Key songs?:\s*(.+)$/);
      var songs = songMatch ? songMatch[1].replace(/_/g, '').trim() : '';
      var desc = body.replace(/Key songs?:[\s\S]*$/, '').replace(/_/g, '').trim();
      chars.push({ name: name, meta: meta, desc: desc, songs: songs });
    }
    return chars;
  }

  function extractSection(text, heading) {
    var re = new RegExp('### ' + heading + '\\n([\\s\\S]+?)(?=\\n### |\\n---\\n### |$)');
    var m = text.match(re);
    return m ? m[1].trim() : '';
  }

  function buildRequirements(reqText) {
    if (!reqText) return '';
    var lines = reqText.split('\n').filter(function(l) { return l.startsWith('- '); });
    return lines.map(function(l) {
      var clean = l.replace(/^- /, '').replace(/\*\*/g, '');
      var parts = clean.split(':');
      var label = parts[0].trim();
      var val = parts.slice(1).join(':').trim();
      return '<li><strong>' + label + '</strong>' +
        (val ? ': <span style="color:#555;">' + val + '</span>' : '') + '</li>';
    }).join('');
  }

  function buildPage(f, pf) {
    var chars      = parseCharacters(f['Other Information'] || '');
    var advisory   = extractSection(f['Other Information'] || '', 'Content Advisory');
    var parentInfo = extractSection(f['Other Information'] || '', 'Parent Information');
    var callbacks  = extractSection(f['Other Information'] || '', 'Callbacks');
    var auditionUrl = (f['Audition Form'] || [])[0] || '#';
    var status     = f['Audition Status'] || '';
    var draft      = isDraft(status);

    var showName   = pf['Name'] || 'Audition';
    var showType   = pf['Type'] || '';
    var showDates  = formatShowDates(pf['Start Date'], pf['Closing Date']);
    var subtitle   = (showType ? showType + ' Program' : 'Production') + ' \u00b7 Theater West End';
    var calUrl     = pf['\uD83D\uDD17 Calendar URL (Public)'] || '';

    var rehearsals = stripMd(f['Rehearsals'] || '') || 'TBD';
    var danceReq   = f['Ask Dance Experience?'] ? 'Yes' : 'No';
    var subsDue    = f['Submissions Due'] ? formatDate(f['Submissions Due']) : '';

    var charCards = chars.map(function(c) {
      return '<div class="twe-char-card">' +
        '<div class="twe-char-name">' + c.name + '</div>' +
        '<div class="twe-char-meta">' + c.meta + '</div>' +
        '<div class="twe-char-desc">' + c.desc + '</div>' +
        (c.songs ? '<div class="twe-char-songs">Songs: ' + c.songs + '</div>' : '') +
        '</div>';
    }).join('');

    var ctaBtn = draft
      ? '<div class="twe-btn-disabled">Auditions Not Yet Open</div>'
      : '<a class="twe-btn" href="' + auditionUrl + '" target="_blank">Submit Audition</a>';

    var calRow = calUrl
      ? '<div class="twe-srow"><span class="lbl">Schedule</span><span class="val"><a href="' + calUrl + '" target="_blank">View Calendar</a></span></div>'
      : '';

    var sidebarRows =
      '<div class="twe-srow"><span class="lbl">Program</span><span class="val">' + (showType || 'TBD') + '</span></div>' +
      '<div class="twe-srow"><span class="lbl">Status</span><span class="val">' + (status || 'TBD') + '</span></div>' +
      '<div class="twe-srow"><span class="lbl">Performances</span><span class="val">' + showDates + '</span></div>' +
      '<div class="twe-srow-block"><span class="lbl">Rehearsals</span><span class="val">' + rehearsals + '</span></div>' +
      (subsDue ? '<div class="twe-srow"><span class="lbl">Submissions Due</span><span class="val">' + subsDue + '</span></div>' : '') +
      '<div class="twe-srow"><span class="lbl">Dance eval?</span><span class="val">' + danceReq + '</span></div>' +
      calRow;

    return '' +
      '<div class="twe-show-header">' +
        '<div class="twe-status-pill' + (status === 'Now Accepting' ? ' twe-status-pill--active' : '') + '">' + (status || 'Upcoming') + '</div>' +
        '<h1 class="twe-h1">' + showName + '</h1>' +
        '<div class="twe-subtitle">' + subtitle + '</div>' +
      '</div>' +

      '<div class="twe-grid" id="twe-grid">' +

        '<div>' +

          '<div class="twe-section">' +
            '<div class="twe-section-heading">About the Production</div>' +
            '<div class="twe-body">' + wrapP(mdToHtml(f['Description'] || '')) + '</div>' +
          '</div>' +

          '<hr class="twe-divider">' +

          '<div class="twe-section">' +
            '<div class="twe-section-heading">Audition Guidelines</div>' +
            '<div class="twe-body">' + wrapP(mdToHtml(f['Guidelines'] || '')) + '</div>' +
          '</div>' +

          '<hr class="twe-divider">' +

          '<div class="twe-section">' +
            '<div class="twe-section-heading">Requirements</div>' +
            '<ul class="twe-req-list">' + buildRequirements(f['Requirements'] || '') + '</ul>' +
          '</div>' +

          (chars.length ? (
            '<hr class="twe-divider">' +
            '<div class="twe-section">' +
              '<div class="twe-section-heading">Character Breakdown</div>' +
              '<div style="font-family:\'eighties-cond\',sans-serif;font-size:17px;line-height:1.7;color:#666;margin:0 0 1rem;font-style:normal;">All roles are open to performers of any race or ethnicity.</div>' +
              '<div class="twe-char-grid">' + charCards + '</div>' +
            '</div>'
          ) : '') +

          (advisory ? (
            '<hr class="twe-divider">' +
            '<div class="twe-section">' +
              '<div class="twe-section-heading">Content Advisory</div>' +
              '<div class="twe-advisory"><p>' + mdToHtml(advisory) + '</p></div>' +
            '</div>'
          ) : '') +

          (parentInfo ? (
            '<hr class="twe-divider">' +
            '<div class="twe-section">' +
              '<div class="twe-section-heading">For Parents &amp; Families</div>' +
              '<div class="twe-body">' + wrapP(mdToHtml(parentInfo)) + '</div>' +
            '</div>'
          ) : '') +

          (callbacks ? (
            '<hr class="twe-divider">' +
            '<div class="twe-section">' +
              '<div class="twe-section-heading">Callbacks</div>' +
              '<div class="twe-body">' + wrapP(mdToHtml(callbacks)) + '</div>' +
            '</div>'
          ) : '') +

          '<div class="twe-data-badge">&#9632; Live from Airtable &middot; updates automatically</div>' +

        '</div>' +

        '<div id="twe-sidebar-col">' +
          '<div class="twe-sidebar-inner" id="twe-sidebar-inner">' +
            '<div class="twe-sidebar">' +
              '<div class="twe-sidebar-heading">Production Details</div>' +
              sidebarRows +
              ctaBtn +
            '</div>' +
          '</div>' +
        '</div>' +

      '</div>';
  }


  function airtableFetch(tableId, recordId) {
    return fetch(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + tableId + '/' + recordId + '?t=' + Date.now(),
      { headers: { 'Authorization': 'Bearer ' + API_KEY }, cache: 'no-store' }
    ).then(function(res) {
      if (!res.ok) throw new Error('Airtable error ' + res.status + ' on ' + tableId);
      return res.json();
    });
  }

  Promise.all([
    airtableFetch(AUDITION_TABLE_ID, AUDITION_RECORD_ID),
    airtableFetch(PRODUCTION_TABLE_ID, PRODUCTION_RECORD_ID)
  ])
  .then(function(results) {
    var auditionFields   = results[0].fields;
    var productionFields = results[1].fields;

    document.getElementById('twe-loading').style.display = 'none';
    var content = document.getElementById('twe-content');
    content.innerHTML = buildPage(auditionFields, productionFields);
    content.style.display = 'block';
  })
  .catch(function(err) {
    document.getElementById('twe-loading').style.display = 'none';
    var el = document.getElementById('twe-error');
    el.textContent = 'Could not load audition data: ' + err.message;
    el.style.display = 'block';
  });

})();
