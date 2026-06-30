import type Highcharts from 'highcharts';

export function getChartTheme(dark: boolean): Highcharts.Options {
  const fg = dark ? '#edf2f7' : '#1a1a1a';
  const fgSecondary = dark ? '#a0aec0' : '#4a5568';
  const gridColor = dark ? '#2d3748' : '#dce0e7';
  const bgColor = dark ? '#1a202c' : '#ffffff';

  return {
    chart: {
      backgroundColor: bgColor,
      style: { fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif' },
      animation: { duration: 300 },
    },
    title: { style: { color: fg, fontSize: '13px', fontWeight: '600' } },
    subtitle: { style: { color: fgSecondary, fontSize: '11px' } },
    xAxis: {
      labels: { style: { color: fgSecondary, fontSize: '10px' } },
      lineColor: gridColor,
      tickColor: gridColor,
      title: { style: { color: fgSecondary } },
    },
    yAxis: {
      labels: { style: { color: fgSecondary, fontSize: '10px' } },
      gridLineColor: gridColor,
      title: { style: { color: fgSecondary } },
    },
    legend: {
      itemStyle: { color: fg, fontSize: '11px', fontWeight: '500' },
      itemHoverStyle: { color: '#185FA5' },
    },
    tooltip: {
      backgroundColor: bgColor,
      borderColor: gridColor,
      style: { color: fg, fontSize: '12px' },
      shadow: false,
    },
    plotOptions: {
      series: { animation: { duration: 400 } },
    },
    credits: { enabled: false },
    colors: ['#185FA5', '#378ADD', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'],
  };
}
