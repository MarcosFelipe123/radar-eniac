const dscc = require('@google/dscc');
const d3 = require('d3');

// Função principal de desenho
const drawViz = (data) => {
  // Limpar visualização anterior
  d3.select('#viz-container').selectAll('*').remove();

  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = dscc.getWidth() - margin.left - margin.right;
  const height = dscc.getHeight() - margin.top - margin.bottom;
  const radius = Math.min(width / 2, height / 2);

  // Extração de dados e configurações de estilo
  const style = data.style;
  const fields = data.fields;
  const rows = data.tables.DEFAULT;
  
  const levels = style.levels.value || 5;
  const opacityArea = style.opacity.value;
  const strokeWidth = style.strokeWidth.value;
  const gridColor = style.gridColor.value.color;
  const showDots = style.showDots.value;

  // Formatação de dados para D3 Radar
  const allAxis = rows.map(d => d[fields.concepts[0].id]);
  const totalAxes = allAxis.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Escala
  const maxValue = d3.max(rows, d => {
    return d3.max(fields.metrics.map(m => d[m.id]));
  });
  const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);

  // Container SVG
  const svg = d3.select('#viz-container')
    .append('svg')
    .attr('width', dscc.getWidth())
    .attr('height', dscc.getHeight())
    .style('background', 'transparent')
    .append('g')
    .attr('transform', `translate(${(width/2) + margin.left}, ${(height/2) + margin.top})`);

  // --- DESENHO DO GRID ---
  const axisGrid = svg.append('g').attr('class', 'axisWrapper');
  for (let j = 0; j < levels; j++) {
    const levelFactor = radius * ((j + 1) / levels);
    axisGrid.selectAll('.levels')
      .data([1]).enter()
      .append('circle')
      .attr('r', levelFactor)
      .style('fill', 'none')
      .style('stroke', gridColor)
      .style('stroke-dasharray', '2,2')
      .style('stroke-width', '0.5px');
  }

  // --- EIXOS (Raios) ---
  const axis = axisGrid.selectAll('.axis')
    .data(allAxis).enter()
    .append('g').attr('class', 'axis');

  axis.append('line')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', (d, i) => rScale(maxValue) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr('y2', (d, i) => rScale(maxValue) * Math.sin(angleSlice * i - Math.PI / 2))
    .style('stroke', gridColor)
    .style('stroke-width', '1px');

  // Labels dos Eixos
  axis.append('text')
    .attr('class', 'legend')
    .style('font-size', '11px')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('x', (d, i) => rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr('y', (d, i) => rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
    .text(d => d);

  // --- DESENHO DAS MÉTRICAS (Áreas) ---
  const radarLine = d3.lineRadial()
    .radius(d => rScale(d.value))
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  fields.metrics.forEach((metric, mIndex) => {
    const metricData = rows.map(r => ({ value: r[metric.id] }));
    const color = dscc.getTheme().accentMax.color; // Pega cor do tema ou você pode definir via style

    const blobWrapper = svg.append('g').attr('class', 'radarWrapper');

    // Área preenchida
    blobWrapper.append('path')
      .attr('d', radarLine(metricData))
      .style('fill', color)
      .style('fill-opacity', opacityArea)
      .on('mouseover', function() {
          d3.select(this).style('fill-opacity', 0.7);
      })
      .on('mouseout', function() {
          d3.select(this).style('fill-opacity', opacityArea);
      });

    // Borda da linha
    blobWrapper.append('path')
      .attr('d', radarLine(metricData))
      .style('stroke-width', strokeWidth + 'px')
      .style('stroke', color)
      .style('fill', 'none');

    // Marcadores (Dots)
    if (showDots) {
      blobWrapper.selectAll('.radarCircle')
        .data(metricData).enter()
        .append('circle')
        .attr('r', 4)
        .attr('cx', (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr('cy', (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
        .style('fill', color)
        .style('fill-opacity', 0.8);
    }
  });
};

// Escuta do Looker Studio
dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });