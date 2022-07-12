/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 24/09/19
 */

module.exports.excel2html = function (ws) {
	let html = `<html>
		<head><style>td {overflow: hidden; height: 15px }
		 tr {background-color: #fafafa } </style></head>	
		<body><table>`;
	// let html = `<table>`;
	for (let ri=1; ri <= ws.rowCount; ri++) {
		html += `<tr>`;
		for (let ci=1; ci <= ws.columnCount; ci++) {
			let cell = ws.getCell(ri, ci);
			html += `<td `;
			if (cell._mergeCount) {
				html += `colspan="${cell._mergeCount + 1}"`;
				ci += (cell._mergeCount);
			}
			html += `style="`;
			if (ws.getColumn(ci-1) && ws.getColumn(ci-1).width) {
				html += 'min-width:' + (ws.getColumn(ci-1).width * 10) + 'px; ';
				html += 'max-width:' + (ws.getColumn(ci-1).width * 10) + 'px; ';
			}
			if (cell.font) {
				if(cell.font.size)
					html += 'font-size:' + cell.font.size+'px' + ';';
				if(cell.font.color && cell.font.color.argb)
					html += 'color:' + '#'+cell.font.color.argb + ';';
				if(cell.font.bold)
					html += 'font-weight:' + 'bold' + ';';
				if(cell.font.italic)
					html += 'font-style:' + 'italic' + ';';
				if(cell.font.underline)
					html += 'text-decoration:' + 'underline' + ';';
				if(cell.font.strike)
					html += 'text-decoration:' + 'line-through' + ';';

			}
			if (cell.alignment) {
				if (cell.alignment.horizontal)
					html += 'text-align:' + cell.alignment.horizontal + ';';
				if (cell.alignment.vertical)
					html += 'vertical-align:' + cell.alignment.vertical + ';';

			}
			if(cell.border) {
				if (cell.border.top) {
					if (cell.border.top.style)
						html += 'border-top-style:' + cell.border.top.style + ';';
					if (cell.border.top.color &&cell.border.top.color.argb)
						html += 'border-top-color:' + '#'+cell.border.top.color.argb + ';';
				}
				if (cell.border.left) {
					if (cell.border.left.style)
						html += 'border-left-style:' + cell.border.left.style + ';';
					if (cell.border.left.color &&cell.border.left.color.argb)
						html += 'border-left-color:' + '#'+cell.border.left.color.argb + ';';
				}
				if (cell.border.bottom) {
					if (cell.border.bottom.style)
						html += 'border-bottom-style:' + cell.border.bottom.style + ';';
					if (cell.border.bottom.color &&cell.border.bottom.color.argb)
						html += 'border-bottom-color:' + '#'+cell.border.bottom.color.argb + ';';
				}
				if (cell.border.right) {
					if (cell.border.right.style)
						html += 'border-right-style:' + cell.border.right.style + ';';
					if (cell.border.right.color &&cell.border.right.color.argb)
						html += 'border-right-color:' + '#'+cell.border.right.color.argb + ';';
				}
			}
			if (cell.fill) {
				if (cell.fill.fgColor && cell.fill.fgColor.argb)
					html += 'background-color:' + '#'+cell.fill.fgColor.argb + ';';
				else if (cell.fill.bgColor && cell.fill.bgColor.argb)
					html += 'background-color:' + '#'+cell.fill.fgColor.argb + ';';
			}
			html += '"> ' + (cell.value || ' ') + '</td>\n';
		}
		html += '</tr>\n';
	}
	html += `</table></body></html>`;
	return html;
};
