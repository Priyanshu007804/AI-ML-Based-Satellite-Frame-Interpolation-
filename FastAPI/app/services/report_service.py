"""
Report generation service.

Generates HTML comparison reports with metrics charts,
frame comparisons, and analysis for batch interpolation results.
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
import base64
import json

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def generate_html_report(
    job_id: str,
    input_frames: list[str],
    interpolated_frames: list[str],
    all_frames: list[str],
    metrics_list: list[dict],
    average_metrics: dict,
    satellite_type: str = "unknown",
    output_path: Optional[str | Path] = None,
) -> str:
    """Generate an HTML report comparing original and interpolated frames.

    Args:
        job_id: Batch job identifier.
        input_frames: Paths to original input frames.
        interpolated_frames: Paths to interpolated frames.
        all_frames: Paths to all frames (interleaved).
        metrics_list: Per-pair metrics list.
        average_metrics: Average metrics across all pairs.
        satellite_type: Detected satellite type.
        output_path: Optional path to save the HTML file.

    Returns:
        HTML string.
    """
    # Generate metrics chart data
    chart_data = _build_chart_data(metrics_list)

    # Generate thumbnail previews (small base64 images)
    input_thumbs = [_img_to_base64_thumb(p, 200) for p in input_frames[:8]]
    interp_thumbs = [_img_to_base64_thumb(p, 200) for p in interpolated_frames[:8]]

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>INTEREP AI — Interpolation Report</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0e1a;
            color: #e2e8f0;
            line-height: 1.6;
            padding: 2rem;
        }}
        .container {{ max-width: 1000px; margin: 0 auto; }}
        h1 {{
            font-size: 2rem;
            background: linear-gradient(135deg, #22d3ee, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }}
        h2 {{
            font-size: 1.3rem;
            color: #22d3ee;
            margin: 2rem 0 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(34,211,238,0.2);
        }}
        .meta {{ color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }}
        .card {{
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(34,211,238,0.15);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }}
        .metric-card {{
            background: rgba(7, 20, 40, 0.7);
            border: 1px solid rgba(34,211,238,0.1);
            border-radius: 10px;
            padding: 1.2rem;
            text-align: center;
        }}
        .metric-value {{
            font-size: 2rem;
            font-weight: 700;
            color: #22d3ee;
        }}
        .metric-label {{
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 0.3rem;
        }}
        .metric-good {{ color: #4ade80; }}
        .metric-avg {{ color: #22d3ee; }}
        .metric-poor {{ color: #fb923c; }}
        .thumbnails {{
            display: flex;
            gap: 0.75rem;
            overflow-x: auto;
            padding: 0.5rem 0;
        }}
        .thumb {{
            flex-shrink: 0;
            width: 150px;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid rgba(34,211,238,0.2);
        }}
        .chart-container {{
            background: rgba(7, 20, 40, 0.5);
            border-radius: 10px;
            padding: 1rem;
            margin: 1rem 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }}
        th {{
            text-align: left;
            padding: 0.7rem;
            border-bottom: 2px solid rgba(34,211,238,0.2);
            color: #22d3ee;
            font-weight: 600;
        }}
        td {{
            padding: 0.6rem 0.7rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }}
        .bar {{
            height: 6px;
            border-radius: 3px;
            background: rgba(34,211,238,0.15);
            overflow: hidden;
        }}
        .bar-fill {{
            height: 100%;
            border-radius: 3px;
            background: linear-gradient(90deg, #22d3ee, #8b5cf6);
        }}
        .badge {{
            display: inline-block;
            padding: 0.2rem 0.6rem;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
        }}
        .badge-good {{ background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }}
        .badge-info {{ background: rgba(34,211,238,0.15); color: #22d3ee; border: 1px solid rgba(34,211,238,0.3); }}
        .footer {{
            margin-top: 3rem;
            text-align: center;
            color: #475569;
            font-size: 0.75rem;
        }}
        canvas {{ width: 100% !important; max-height: 300px; }}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
</head>
<body>
    <div class="container">
        <h1>INTEREP AI — Frame Interpolation Report</h1>
        <p class="meta">
            Job ID: {job_id} &nbsp;|&nbsp;
            Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} &nbsp;|&nbsp;
            Satellite: {satellite_type.upper()} &nbsp;|&nbsp;
            Input Frames: {len(input_frames)} &nbsp;→&nbsp;
            Output Frames: {len(all_frames)}
            <span class="badge badge-info" style="margin-left:0.5rem;">
                {len(all_frames) / max(len(input_frames), 1):.0f}× Enhanced
            </span>
        </p>

        <h2>📊 Average Quality Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value {_quality_class(average_metrics.get('ssim', 0), 'ssim')}">{average_metrics.get('ssim', 'N/A')}</div>
                <div class="metric-label">SSIM (Structural Similarity)</div>
                <div class="bar"><div class="bar-fill" style="width:{average_metrics.get('ssim', 0)*100:.0f}%"></div></div>
            </div>
            <div class="metric-card">
                <div class="metric-value {_quality_class(average_metrics.get('psnr', 0), 'psnr')}">{average_metrics.get('psnr', 'N/A')}</div>
                <div class="metric-label">PSNR (dB)</div>
                <div class="bar"><div class="bar-fill" style="width:{min(average_metrics.get('psnr', 0)/50*100, 100):.0f}%"></div></div>
            </div>
            <div class="metric-card">
                <div class="metric-value {_quality_class(average_metrics.get('mse', 1), 'mse')}">{average_metrics.get('mse', 'N/A')}</div>
                <div class="metric-label">MSE (Mean Squared Error)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value {_quality_class(average_metrics.get('fsim', 0), 'fsim')}">{average_metrics.get('fsim', 'N/A')}</div>
                <div class="metric-label">FSIM (Feature Similarity)</div>
                <div class="bar"><div class="bar-fill" style="width:{average_metrics.get('fsim', 0)*100:.0f}%"></div></div>
            </div>
        </div>

        <h2>📈 Metrics Across Frames</h2>
        <div class="chart-container">
            <canvas id="metricsChart"></canvas>
        </div>

        <h2>🛰️ Input Frames</h2>
        <div class="card">
            <div class="thumbnails">
                {''.join(f'<img class="thumb" src="{t}" alt="Input {i+1}">' for i, t in enumerate(input_thumbs))}
            </div>
            <p style="margin-top:0.5rem;color:#64748b;font-size:0.8rem;">{len(input_frames)} original satellite observations</p>
        </div>

        <h2>🤖 Interpolated Frames</h2>
        <div class="card">
            <div class="thumbnails">
                {''.join(f'<img class="thumb" src="{t}" alt="Interpolated {i+1}">' for i, t in enumerate(interp_thumbs))}
            </div>
            <p style="margin-top:0.5rem;color:#64748b;font-size:0.8rem;">{len(interpolated_frames)} AI-generated intermediate frames</p>
        </div>

        <h2>📋 Per-Pair Metrics</h2>
        <div class="card" style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th>Pair</th>
                        <th>SSIM</th>
                        <th>PSNR (dB)</th>
                        <th>MSE</th>
                        <th>FSIM</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(_metrics_row(m) for m in metrics_list)}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>INTEREP AI — AI-Powered Satellite Temporal Resolution Enhancement</p>
            <p>ISRO Bharatiya Antariksh Hackathon 2026</p>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('metricsChart').getContext('2d');
        const chartData = {json.dumps(chart_data)};
        new Chart(ctx, {{
            type: 'line',
            data: {{
                labels: chartData.labels,
                datasets: [
                    {{
                        label: 'SSIM',
                        data: chartData.ssim,
                        borderColor: '#22d3ee',
                        backgroundColor: 'rgba(34,211,238,0.1)',
                        tension: 0.4,
                        fill: true,
                    }},
                    {{
                        label: 'FSIM',
                        data: chartData.fsim,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139,92,246,0.1)',
                        tension: 0.4,
                        fill: true,
                    }},
                    {{
                        label: 'PSNR (normalized)',
                        data: chartData.psnr_norm,
                        borderColor: '#4ade80',
                        backgroundColor: 'rgba(74,222,128,0.1)',
                        tension: 0.4,
                        fill: true,
                    }},
                ]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{ labels: {{ color: '#94a3b8' }} }},
                }},
                scales: {{
                    x: {{ ticks: {{ color: '#64748b' }}, grid: {{ color: 'rgba(255,255,255,0.05)' }} }},
                    y: {{ ticks: {{ color: '#64748b' }}, grid: {{ color: 'rgba(255,255,255,0.05)' }}, min: 0, max: 1 }},
                }}
            }}
        }});
    <\/script>
</body>
</html>"""

    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info("Report saved to %s", output_path)

    return html


def _build_chart_data(metrics_list: list[dict]) -> dict:
    """Build chart.js-compatible data from metrics list."""
    labels = [f"Pair {m.get('pair_index', i)+1}" for i, m in enumerate(metrics_list)]
    return {
        "labels": labels,
        "ssim": [m.get("ssim", 0) for m in metrics_list],
        "fsim": [m.get("fsim", 0) for m in metrics_list],
        "psnr_norm": [min(m.get("psnr", 0) / 50.0, 1.0) for m in metrics_list],
        "mse": [m.get("mse", 0) for m in metrics_list],
    }


def _quality_class(value, metric: str) -> str:
    """Return CSS class based on metric quality."""
    if metric == "ssim" or metric == "fsim":
        if value >= 0.8: return "metric-good"
        if value >= 0.6: return "metric-avg"
        return "metric-poor"
    elif metric == "psnr":
        if value >= 30: return "metric-good"
        if value >= 25: return "metric-avg"
        return "metric-poor"
    elif metric == "mse":
        if value <= 0.005: return "metric-good"
        if value <= 0.02: return "metric-avg"
        return "metric-poor"
    return "metric-avg"


def _metrics_row(m: dict) -> str:
    """Generate a table row for a metrics entry."""
    idx = m.get("pair_index", 0) + 1
    return f"""<tr>
        <td>Pair {idx}</td>
        <td class="{_quality_class(m.get('ssim', 0), 'ssim')}">{m.get('ssim', 'N/A')}</td>
        <td class="{_quality_class(m.get('psnr', 0), 'psnr')}">{m.get('psnr', 'N/A')}</td>
        <td class="{_quality_class(m.get('mse', 1), 'mse')}">{m.get('mse', 'N/A')}</td>
        <td class="{_quality_class(m.get('fsim', 0), 'fsim')}">{m.get('fsim', 'N/A')}</td>
    </tr>"""


def _img_to_base64_thumb(path: str, max_size: int = 200) -> str:
    """Convert an image to a small base64-encoded thumbnail."""
    try:
        img = cv2.imread(path)
        if img is None:
            return ""
        h, w = img.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 70])
        b64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        return ""
