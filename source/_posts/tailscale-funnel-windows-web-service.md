---
title: 图解 Tailscale Funnel：无需公网 IP、自购域名，让手机直连 Windows Web 服务
date: 2026-10-19 18:50:01
updated: 2026-10-20 12:00:00
categories:
  - 网络互联
tags:
  - Tailscale
  - Funnel
  - Windows
  - HTTPS
  - WebSocket
sticky: 100
index_img: "https://fluid.s3.bitiful.net/bg/dojm2h.png?w=960&fmt=webp"
excerpt: 在 Windows 主机上使用 Tailscale Funnel，将本地 Web 服务安全接入公网 HTTPS；涵盖安装、开机运行、WSS 验证、DNS 排障与安全加固。
---

<div class="tailscale-guide">
{% raw %}
<p class="lead-deck">在 Windows 主机上安装 Tailscale，把本地 Web 服务接入公网 HTTPS。手机只需浏览器；下面用 D11 集群管理界面串起部署、验证和排障全过程。</p><div class="quick-read" aria-label="方案要点"><div><strong>手机零客户端</strong><p>移动网络或外部 Wi-Fi，使用浏览器打开公网入口。</p></div><div><strong>主机单点接入</strong><p>只在 Web 主机安装 Tailscale，保留原有局域网业务。</p></div><div><strong>逐层验证结果</strong><p>配置成功、HTTPS 可用、业务可用，是三个不同结论。</p></div></div><p class="reader-note"><strong>阅读路线：</strong>先看<a href="#section-3">访问架构</a>，再按<a href="#setup-map">六步部署图</a>操作；遇到问题直接看<a href="#trouble-map">分层排障图</a>。本文日期为 2026-10-19；v1 在原 HTML 教程基础上增加图解，保留原有命令和技术说明。</p>
<blockquote>
<p>日期：2026-10-19<br>适用场景：Windows 主机运行 Web 管理界面，希望手机通过移动网络或其他 Wi-Fi 直接用浏览器访问。<br>本文中的域名、IP、路径均为示例，不包含真实账号、密码或授权令牌。产品界面、功能限制和套餐政策可能变化，请以官方文档及控制台提示为准。</p>
</blockquote>
<h2 id="section-2">一、为什么局域网地址不能直接从外网访问？</h2>
<p>假设一台 Windows 主机运行了 Web 服务，端口为 <code>9091</code>，局域网内可以通过以下地址访问：</p>
<div class="code-block"><div class="code-toolbar"><span>text</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-text">http://192.168.10.20:9091/</code></pre></div>
<p>手机连接同一个局域网时可以打开页面，但切换到移动网络后无法访问。这是因为 <code>192.168.x.x</code> 属于私有地址，互联网不会把请求直接路由到这台主机。</p>
<p>如果没有可入站访问的公网 IP，或者无法配置路由器端口映射，可以使用 <strong>Tailscale Funnel</strong> 为本地 Web 服务增加公网 HTTPS 入口。</p>
<p>本文希望达到的效果是：</p>
<ul>
<li>手机不安装 Tailscale 客户端，只使用浏览器。</li>
<li>不购买独立域名，使用 Tailscale 分配的 <code>ts.net</code> 子域名。</li>
<li>不在路由器上开放 Web 服务端口。</li>
<li>使用 HTTPS 访问页面，并支持 WSS 实时数据连接。</li>
<li>Windows 主机未登录桌面时，相关服务仍能运行。</li>
<li>原有局域网访问方式继续保留。</li>
</ul>
<p>注意：这些条件不代表所有网络都一定能访问。DNS、运营商网络、代理以及 Tailscale 服务可用性都可能影响连接。</p>
<h2 id="section-3">二、方案原理</h2>
<p class="lead-deck">先用一张图理解：手机访问公网域名，Funnel 把请求送回 D11，再由 D11 的 WebGUI 提供页面、接口和设备监控。</p><p>下图采用集群管理场景作为示例：<strong>D11 表示 WebGUI 主机</strong>，D0、D1 等表示集群节点。通用部署时，将 D11 替换为自己的 Windows 主机即可，后续命令仍使用示例设备名 <code>web-host</code>。</p>
<figure class="visual-figure" aria-labelledby="arch-caption"><div class="figure-topline"><span class="figure-index">FIG. 01 / 访问架构</span><span>DNS 解析与 HTTPS 请求分开表示</span></div><svg class="diagram-desktop" viewBox="0 0 820 930" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="arch-title arch-desc">
<title id="arch-title">手机经公网 DNS 和 Tailscale Funnel 访问 D11 WebGUI</title><desc id="arch-desc">浏览器先查询 DNS 获取公网入口地址，再通过 HTTPS 443 连接 Funnel。加密请求到达 D11 的 Tailscale，在 D11 终止 HTTPS 后转发到本机 9091 端口。WebGUI 提供管理页面，并通过局域网 SSH 采集远程节点。本机 D11 使用本地采集。</desc>
<defs><marker id="arrow-v1" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9Z" fill="#347a95"/></marker><marker id="dns-arrow-v1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#af7756"/></marker></defs>
<rect x="20" y="12" width="780" height="374" rx="18" fill="#f1f6fa" stroke="#d1e0e8"/><text x="42" y="41" class="svg-label">01 / 访问端与公网</text>
<rect x="210" y="58" width="400" height="78" rx="12" fill="#dcebf5"/><text x="410" y="88" text-anchor="middle" class="svg-title">手机移动网络 / 外部 Wi-Fi</text><text x="410" y="115" text-anchor="middle" class="svg-sub">浏览器 · 无需安装 Tailscale 客户端</text>
<path d="M410 136V176" fill="none" stroke="#af7756" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#dns-arrow-v1)"/>
<rect x="255" y="180" width="310" height="64" rx="12" fill="#f4e8d8"/><text x="410" y="207" text-anchor="middle" class="svg-title">公网 DNS</text><text x="410" y="228" text-anchor="middle" class="svg-sub">解析 ts.net 域名，获得入口 IP</text>
<path d="M410 244V284" fill="none" stroke="#af7756" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#dns-arrow-v1)"/><text x="426" y="268" class="svg-small">地址解析完成</text>
<path d="M610 98H728V326H610" fill="none" stroke="#347a95" stroke-width="2.4" marker-end="url(#arrow-v1)"/><text x="747" y="186" class="svg-small" transform="rotate(90 747 186)">实际 HTTPS / WSS 流量</text>
<rect x="210" y="290" width="400" height="72" rx="12" fill="#dae9ef"/><text x="410" y="320" text-anchor="middle" class="svg-title">Tailscale Funnel 公网入口</text><text x="410" y="343" text-anchor="middle" class="svg-sub">HTTPS · 443 / 转发加密流量</text>

<rect x="20" y="435" width="780" height="475" rx="18" fill="#f4f5ed" stroke="#dce1cc"/><text x="42" y="464" class="svg-label">02 / D11 主机与集群局域网</text><path d="M410 362V472" fill="none" stroke="#347a95" stroke-width="2.4" marker-end="url(#arrow-v1)"/><text x="427" y="412" class="svg-small">连接到已授权的 D11</text>
<rect x="210" y="478" width="400" height="76" rx="12" fill="#dcebe5"/><text x="410" y="508" text-anchor="middle" class="svg-title">D11 上的 Tailscale 服务</text><text x="410" y="534" text-anchor="middle" class="svg-sub">接收并终止 HTTPS · 自动管理证书</text>
<path d="M410 554V591" fill="none" stroke="#347a95" stroke-width="2.4" marker-end="url(#arrow-v1)"/>
<rect x="210" y="597" width="400" height="76" rx="12" fill="#ddece7"/><text x="410" y="627" text-anchor="middle" class="svg-title">D11 本机 WebGUI</text><text x="410" y="653" text-anchor="middle" class="svg-sub">http://127.0.0.1:9091</text>
<path d="M410 673V704H220V739" fill="none" stroke="#347a95" stroke-width="2.4" marker-end="url(#arrow-v1)"/>
<rect x="48" y="745" width="345" height="98" rx="12" fill="#e6edf3"/><text x="220" y="776" text-anchor="middle" class="svg-title">管理与可视化功能</text><text x="220" y="802" text-anchor="middle" class="svg-sub">Device Monitor / Cluster Topology</text><text x="220" y="824" text-anchor="middle" class="svg-sub">推理管理等功能</text>
<path d="M410 704H610V739" fill="none" stroke="#347a95" stroke-width="2.4" marker-end="url(#arrow-v1)"/><rect x="427" y="745" width="345" height="98" rx="12" fill="#f0e7dc"/><text x="600" y="776" text-anchor="middle" class="svg-title">局域网 SSH 监控</text><text x="600" y="802" text-anchor="middle" class="svg-sub">D0、D1、…、D13 中的远程节点</text><text x="600" y="824" text-anchor="middle" class="svg-sub">D11 本机改用本地采集</text>
<text x="410" y="881" text-anchor="middle" class="svg-small">Funnel 只发布 Web 入口，不直接开放集群节点的 SSH 端口</text></svg><svg class="diagram-mobile" viewBox="0 0 360 970" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mobile-title mobile-desc"><title id="mobile-title">D11 外网访问拓扑，手机竖屏版</title><desc id="mobile-desc">从浏览器经过 DNS 解析、Funnel 入口、D11 Tailscale 服务，到本机 WebGUI，最终分支到管理功能和局域网监控。虚线表示解析步骤，不表示 HTTP 流量经过 DNS。</desc><defs><marker id="arrow-mobile" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#347a95"/></marker></defs>
<text x="20" y="23" class="svg-label">访问端 → 公网入口 → D11</text>
<rect x="15" y="43" width="300" height="78" rx="12" fill="#dcebf5"/><text x="165" y="76" text-anchor="middle" class="svg-title">手机移动网络 / 外部 Wi-Fi</text><text x="165" y="101" text-anchor="middle" class="svg-sub">浏览器 · 无需安装客户端</text>
<path d="M165 121V160" stroke="#af7756" stroke-width="2" stroke-dasharray="5 4"/>
<rect x="15" y="160" width="300" height="70" rx="12" fill="#f4e8d8"/><text x="165" y="190" text-anchor="middle" class="svg-title">公网 DNS</text><text x="165" y="213" text-anchor="middle" class="svg-sub">解析 ts.net 域名，获得 IP</text>
<path d="M165 230V274" stroke="#af7756" stroke-width="2" stroke-dasharray="5 4"/>
<path d="M315 82H340V312H315" fill="none" stroke="#347a95" stroke-width="2" marker-end="url(#arrow-mobile)"/>
<rect x="15" y="274" width="300" height="78" rx="12" fill="#dae9ef"/><text x="165" y="307" text-anchor="middle" class="svg-title">Tailscale Funnel 公网入口</text><text x="165" y="332" text-anchor="middle" class="svg-sub">HTTPS · 443</text>
<path d="M165 352V413" stroke="#347a95" stroke-width="2" marker-end="url(#arrow-mobile)"/>
<rect x="15" y="420" width="300" height="78" rx="12" fill="#dcebe5"/><text x="165" y="452" text-anchor="middle" class="svg-title">D11 上的 Tailscale 服务</text><text x="165" y="478" text-anchor="middle" class="svg-sub">接收并终止 HTTPS</text>
<path d="M165 498V550" stroke="#347a95" stroke-width="2" marker-end="url(#arrow-mobile)"/>
<rect x="15" y="557" width="300" height="78" rx="12" fill="#ddece7"/><text x="165" y="589" text-anchor="middle" class="svg-title">D11 本机 WebGUI</text><text x="165" y="615" text-anchor="middle" class="svg-sub">http://127.0.0.1:9091</text>
<path d="M165 635V680" fill="none" stroke="#347a95" stroke-width="2" marker-end="url(#arrow-mobile)"/>
<rect x="15" y="688" width="300" height="92" rx="12" fill="#e6edf3"/><text x="165" y="718" text-anchor="middle" class="svg-title">管理与可视化功能</text><text x="165" y="744" text-anchor="middle" class="svg-sub">Device Monitor / Cluster Topology</text><text x="165" y="765" text-anchor="middle" class="svg-sub">推理管理等功能</text>
<path d="M165 656H340V863H315" fill="none" stroke="#347a95" stroke-width="2" marker-end="url(#arrow-mobile)"/><rect x="15" y="817" width="300" height="92" rx="12" fill="#f0e7dc"/><text x="165" y="847" text-anchor="middle" class="svg-title">局域网 SSH 监控</text><text x="165" y="873" text-anchor="middle" class="svg-sub">D0、D1、…、D13 的远程节点</text><text x="165" y="895" text-anchor="middle" class="svg-sub">D11 本机使用本地采集</text>
<text x="15" y="950" class="svg-small">虚线：DNS 解析；实线：请求 / 调用方向</text></svg><div class="diagram-legend"><span><i class="legend-line dashed"></i>解析步骤 / 获得入口地址</span><span><i class="legend-line"></i>实际请求与内部调用方向</span></div><figcaption id="arch-caption">图 1：以 D11 为 WebGUI 主机的外网访问结构。箭头用于说明请求或调用方向，响应沿相应连接返回；WSS 实时连接支持双向通信。</figcaption><details class="source-details"><summary>查看原始 Mermaid 图示源码</summary><p>以下是该方案的概念流程源码。实际 HTTP 请求不经过 DNS，图中的 A → B → C 应理解为“先解析，再连接”。</p><div class="code-block"><div class="code-toolbar"><span>mermaid</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-mermaid">flowchart TD
    A[&quot;手机移动网络 / 外部 Wi-Fi&lt;br/&gt;浏览器&quot;] --&gt; B[&quot;公网 DNS&lt;br/&gt;解析 ts.net 域名&quot;]
    B --&gt; C[&quot;Tailscale Funnel 公网入口&lt;br/&gt;HTTPS · 443&quot;]
    C --&gt; D[&quot;D11 上的 Tailscale 服务&lt;br/&gt;接收并终止 HTTPS&quot;]
    D --&gt; E[&quot;D11 本机 WebGUI&lt;br/&gt;http://127.0.0.1:9091&quot;]
    E --&gt; F[&quot;Device Monitor / Cluster Topology&lt;br/&gt;推理管理等功能&quot;]
    E --&gt; G[&quot;局域网 SSH 监控&lt;br/&gt;D0、D1、…、D13&quot;]</code></pre></div></details></figure>
<div class="visual-note"><strong>读图的两个关键点：</strong>公网 DNS 只回答“入口在哪里”，不转发页面或密码；D11 的 WebGUI 负责访问集群内部设备，Funnel 不会把每台节点直接变成公网设备。D11 自身的 Windows 指标使用本地采集。</div>
<p>Windows 主机主动连接 Tailscale 基础设施，Funnel 提供公网入口并将请求送到该主机。浏览器的 HTTPS 连接在主机上的 Tailscale 端终止，再通过本机回环地址转发给 Web 服务。</p>
<p>因此，不需要把路由器上的 <code>9091</code> 端口映射到公网，也不需要修改应用的业务逻辑来实现穿透。</p>
<p>如果 Web 服务还会通过局域网管理其他设备，外部浏览器只需要访问这台 Web 主机，其他设备不必因此全部安装 Tailscale。</p>
<h3 id="section-4">普通 Tailscale、Serve 与 Funnel 的区别</h3>
<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的表格"><table><thead><tr><th>方式</th><th>访问范围</th><th>手机通常需要安装 Tailscale 吗</th><th>用途</th></tr></thead><tbody><tr><td>普通 Tailscale 连接</td><td>获得授权的虚拟专网设备</td><td>需要</td><td>远程访问内网服务</td></tr><tr><td>Tailscale Serve</td><td>虚拟专网内部</td><td>需要</td><td>为专网内设备提供代理或 HTTPS 服务</td></tr><tr><td>Tailscale Funnel</td><td>公网</td><td>不需要</td><td>通过公网网址分享本地服务</td></tr></tbody></table></div>
<p><strong>Funnel 是公网发布能力，不是应用登录系统。</strong> 启用后，能够连接这个网址的外部访问者可以到达应用入口。业务权限应由应用自己的账号、鉴权和访问控制保证。</p>
<h2 id="section-5">三、准备条件</h2>
<p>准备以下内容：</p>
<ol>
<li>一台可以访问互联网的 Windows 主机。</li>
<li>一个可以正常运行的本地 Web 服务，本文示例端口为 <code>9091</code>。</li>
<li>一个 Tailscale 账号，以及允许使用 Funnel 的账号配置。</li>
<li>Windows 管理员权限，用于安装及管理系统服务。</li>
<li>已具备身份验证的 Web 应用，特别是能够执行管理操作的后台。</li>
</ol>
<p>无需提前准备自有域名。最终域名来自 Tailscale，例如：</p>
<div class="code-block"><div class="code-toolbar"><span>text</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-text">https://web-host.&lt;tailnet-name&gt;.ts.net/</code></pre></div>
<p>其中 <code>&lt;tailnet-name&gt;</code> 是占位符，实际访问时应使用 Tailscale 输出的完整域名。重命名设备或修改虚拟专网域名可能影响访问地址。</p>
<figure class="visual-figure" id="setup-map"><div class="figure-topline"><span class="figure-index">FIG. 02 / 六步部署</span><span>每一步都有明确的完成条件</span></div><ol class="steps-grid"><li><span class="step-num">STEP 01</span><a href="#section-6">确认本地应用 ↗</a><p>先让 127.0.0.1:9091 正常响应。</p><span class="step-check">验收：本机页面可以打开</span></li><li><span class="step-num">STEP 02</span><a href="#section-7">安装并授权主机 ↗</a><p>安装 Tailscale，登录账号并授权设备。</p><span class="step-check">验收：状态为 Running</span></li><li><span class="step-num">STEP 03</span><a href="#section-9">启用 HTTPS / Funnel ↗</a><p>按控制台提示启用能力，代理到本机端口。</p><span class="step-check">验收：Funnel 有正确转发目标</span></li><li><span class="step-num">STEP 04</span><a href="#section-10">保障开机运行 ↗</a><p>分别设置应用和 Tailscale 的启动机制。</p><span class="step-check">验收：服务重启后配置保留</span></li><li><span class="step-num">STEP 05</span><a href="#section-11">验证公网业务 ↗</a><p>从外部网络测试 DNS、登录和 WSS 推送。</p><span class="step-check">验收：页面与实时数据均正常</span></li><li><span class="step-num">STEP 06</span><a href="#section-24">维护与回退 ↗</a><p>管理访问凭据，掌握单独关闭公网入口的方法。</p><span class="step-check">验收：局域网服务可继续运行</span></li></ol><figcaption>图 2：按编号推进，点击步骤标题跳转到具体操作。先保证本地服务可用，再验证公网入口，最后验证业务和实时连接。</figcaption></figure>
<h2 id="section-6">四、先验证本地 Web 服务</h2>
<p>在 Web 服务所在的 Windows 主机上打开 PowerShell，执行：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Invoke-WebRequest &#39;http://127.0.0.1:9091/&#39; -UseBasicParsing -TimeoutSec 10</code></pre></div>
<p>确认返回正常页面或预期状态码。很多应用首页返回 <code>200</code>，也有应用会跳转到登录页，应按应用实际行为判断。</p>
<p>查看监听端口：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Get-NetTCPConnection -LocalPort 9091 -State Listen</code></pre></div>
<p>两种常见监听配置：</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的表格"><table><thead><tr><th>监听地址</th><th>含义</th></tr></thead><tbody><tr><td><code>127.0.0.1:9091</code></td><td>仅允许主机本机连接，适合只通过 Funnel 提供访问</td></tr><tr><td><code>0.0.0.0:9091</code></td><td>监听所有 IPv4 接口，可同时保留局域网访问，但仍受防火墙规则控制</td></tr></tbody></table></div>
<p>Funnel 与 Web 服务运行在同一台主机时，转发目标应优先使用 <code>127.0.0.1</code>。不要为了公网访问，额外对所有网络放开应用端口。</p>
<p>如果本机访问已经失败，应先修复应用进程、端口或启动配置，再继续部署隧道。</p>
<h2 id="section-7">五、安装 Tailscale</h2>
<p>从官方页面下载适合 Windows 架构的安装包：</p>
<ul>
<li>下载页面：<a href="https://tailscale.com/download/windows">https://tailscale.com/download/windows</a></li>
<li>官方软件包：<a href="https://pkgs.tailscale.com/stable/">https://pkgs.tailscale.com/stable/</a></li>
</ul>
<p>安装前可以检查数字签名：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Get-AuthenticodeSignature -LiteralPath &#39;C:\Installers\tailscale-setup.msi&#39; |
    Select-Object Status, SignerCertificate</code></pre></div>
<p>将路径替换为实际安装包路径。检查签名状态为 <code>Valid</code>，并核对签名发布者是否为 Tailscale。</p>
<p>安装完成后，确认命令可用：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; version</code></pre></div>
<p>本文后续命令使用默认安装路径。如果安装位置不同，请相应替换。</p>
<h2 id="section-8">六、登录账号并启用无人值守运行</h2>
<p>在管理员 PowerShell 中执行：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; up `
    --hostname=web-host `
    --unattended `
    --accept-dns=false</code></pre></div>
<p>参数说明：</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的表格"><table><thead><tr><th>参数</th><th>作用</th></tr></thead><tbody><tr><td><code>--hostname=web-host</code></td><td>设置设备在 Tailscale 中的名称</td></tr><tr><td><code>--unattended</code></td><td>Windows 无人值守运行，避免依赖用户保持桌面登录</td></tr><tr><td><code>--accept-dns=false</code></td><td>不接管这台主机的系统 DNS；可选，本文用于保留现有解析配置</td></tr></tbody></table></div>
<p>命令会提示打开账号授权链接。请在浏览器中登录自己的 Tailscale 账号，并授权这台设备。</p>
<p>账号授权链接不是最终的 Web 服务地址，不要把它作为外网网址分享。也不要把认证密钥或账号密码写入公开教程、截图和日志。</p>
<p>授权完成后查看状态：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; status</code></pre></div>
<p>需要查看结构化信息时：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">$state = &amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; status --json |
    ConvertFrom-Json

$state | Select-Object BackendState, Health
$state.Self | Select-Object HostName, DNSName, Online</code></pre></div>
<p>通常应看到 <code>BackendState</code> 为 <code>Running</code>。<code>DNSName</code> 是后续需要使用的设备域名，末尾可能带一个表示完整域名的点，浏览器网址通常不需要保留这个末尾点。</p>
<p>如果设备已有 Tailscale 配置，修改参数前先查看现状，避免覆盖既有网络设置。</p>
<h2 id="section-9">七、启用 HTTPS 与 Funnel</h2>
<p>在主机上执行：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel `
    --bg --https=443 http://127.0.0.1:9091</code></pre></div>
<p>第一次使用时，如果账号尚未启用 HTTPS 或 Funnel，命令可能提示类似：</p>
<div class="code-block"><div class="code-toolbar"><span>text</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-text">Funnel is not enabled on your tailnet.
To enable, visit:
https://login.tailscale.com/...</code></pre></div>
<p>打开命令实际返回的链接，按页面提示启用相关能力。系统可能要求确认 HTTPS 证书、MagicDNS 或 Funnel 权限设置。</p>
<p>如果命令还在等待，可在完成网页设置后观察其输出；如果命令已退出，重新执行即可。</p>
<p>成功时通常会输出类似内容：</p>
<div class="code-block"><div class="code-toolbar"><span>text</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-text">Available on the internet:

https://web-host.&lt;tailnet-name&gt;.ts.net/
|-- proxy http://127.0.0.1:9091

Funnel started and running in the background.</code></pre></div>
<p>参数含义：</p>
<ul>
<li><code>--bg</code>：保存后台运行配置，命令结束后仍继续提供转发。</li>
<li><code>--https=443</code>：公网入口使用 HTTPS 443 端口。</li>
<li><code>http://127.0.0.1:9091</code>：主机上的应用地址。</li>
</ul>
<p>首次证书申请或 DNS 生效可能需要时间。<strong>看到上述输出，仅代表 Funnel 配置已接受，不代表外部访问的每个环节都已验证通过。</strong></p>
<p>另外，公网 HTTPS 证书通常会进入证书透明度日志，不应把设备域名当作保密措施。</p>
<h2 id="section-10">八、配置开机运行</h2>
<p>在管理员 PowerShell 中检查并设置 Tailscale 服务：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Get-Service Tailscale

Set-Service -Name Tailscale -StartupType Automatic
Start-Service -Name Tailscale</code></pre></div>
<p>检查或启用无人值守模式：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; set --unattended=true</code></pre></div>
<p>查看 Funnel 配置：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel status</code></pre></div>
<p>需要分别保证两项服务可以自动恢复：</p>
<ol>
<li>Tailscale 服务启动并恢复 Funnel 配置。</li>
<li>Web 应用自身启动并监听 <code>9091</code>。</li>
</ol>
<p>Tailscale 不负责启动你的 Python、Node.js 或其他 Web 应用。Web 应用应通过自身适用的 Windows 服务、开机计划任务或进程监督程序启动。</p>
<p>在允许中断服务的时间，可以重启 Tailscale 验证配置持久性：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Restart-Service Tailscale

&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; status
&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel status</code></pre></div>
<p>重启服务会短暂中断连接。验证服务重启成功，不等于验证了整机开机恢复；后者应在合适的维护窗口单独测试。</p>
<h2 id="section-11">九、从外网验证：不要只检查首页</h2><div class="acceptance-ladder" aria-label="验证完成度"><div><span class="stage">LEVEL 01</span><strong>配置已接受</strong><p>Funnel 显示开启，只能证明代理规则已配置。</p></div><div><span class="stage">LEVEL 02</span><strong>公网 HTTPS 可用</strong><p>外网解析成功、连接建立、证书校验通过。</p></div><div class="final-step"><span class="stage">LEVEL 03</span><strong>业务端到端可用</strong><p>登录、受保护接口和连续 WSS 数据均正常。</p></div></div>
<h3 id="section-12">9.1 选择真实外部网络</h3>
<p>可使用以下任一方式：</p>
<ul>
<li>手机关闭 Wi-Fi，使用移动网络。</li>
<li>另一台连接不同互联网出口的电脑。</li>
</ul>
<p>如果测试端也运行 Tailscale，应确认请求没有通过私网路径到达服务器。测试私网地址 <code>100.x.x.x</code>，不能证明 Funnel 公网链路正常。</p>
<h3 id="section-13">9.2 检查 HTTPS 页面</h3>
<p>以下命令在外部电脑上运行，将示例域名替换为实际域名：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">curl.exe --noproxy &#39;*&#39; --connect-timeout 10 --max-time 25 `
    -o NUL `
    -w &#39;HTTP=%{http_code} REMOTE=%{remote_ip} LOCAL=%{local_ip} TLS=%{ssl_verify_result}&#39; `
    &#39;https://web-host.example-tailnet.ts.net/&#39;</code></pre></div>
<p><code>--noproxy &#39;*&#39;</code> 用于排除代理影响，测试直接访问；如果所在网络必须使用代理，需另行测试代理路径并在结果中注明。</p>
<p>不要使用 <code>-k</code> 跳过证书验证来证明 HTTPS 部署成功。</p>
<h3 id="section-14">9.3 验证应用登录与权限</h3>
<p>至少检查以下行为：</p>
<ul>
<li>正确账号密码可以登录。</li>
<li>错误密码会被拒绝。</li>
<li>未登录不能读取受保护数据或执行管理操作。</li>
<li>页面引用的脚本、样式及接口地址正常。</li>
<li>页面跳转没有被错误地重定向到 <code>localhost</code> 或局域网 IP。</li>
</ul>
<p>如果应用使用完整的外部 URL、可信主机列表、CSRF Origin 或 OAuth 回调地址，还需要把新的 HTTPS 域名加入应用配置。具体配置项取决于应用框架。</p>
<h3 id="section-15">9.4 验证 WebSocket 实时数据</h3>
<p>监控曲线、日志流、任务状态等功能通常依赖 WebSocket。页面能打开，不等于实时数据连接已经成功。</p>
<p>前端应根据页面协议构造连接地址，例如：</p>
<div class="code-block"><div class="code-toolbar"><span>javascript</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-javascript">const scheme = window.location.protocol === &#39;https:&#39; ? &#39;wss:&#39; : &#39;ws:&#39;;
const socket = new WebSocket(`${scheme}//${window.location.host}/ws/monitor`);</code></pre></div>
<p><code>/ws/monitor</code> 只是示例路径。生产应用仍需按自身协议完成 WebSocket 身份验证，上述代码仅演示地址构造。</p>
<p>在浏览器开发者工具的 Network / WS 中检查：</p>
<ul>
<li>WebSocket 握手是否成功。</li>
<li>是否使用 <code>wss://</code>，而不是从 HTTPS 页面连接 <code>ws://</code>。</li>
<li>是否持续收到多条消息。</li>
<li>切换页面、短暂断网后是否能恢复连接。</li>
</ul>
<p>外网接入不会自动提高或降低后端采样频率，但网络延迟和抖动会影响数据到达浏览器的时间。</p>
<h2 id="section-16">十、重点排障：Funnel 已开启，但网址打不开</h2><figure class="visual-figure" id="trouble-map"><div class="figure-topline"><span class="figure-index">FIG. 03 / 从内到外定位</span><span>上一层正常，再检查下一层</span></div><div class="troubleshoot"><div class="trouble-row"><span class="trouble-num">1</span><div><strong>本机应用</strong><p>127.0.0.1:9091 能否访问？</p></div><div class="trouble-action">失败 → 查应用进程、端口与启动日志。</div></div><div class="trouble-row"><span class="trouble-num">2</span><div><strong>隧道与权限</strong><p>Tailscale 在线且 Funnel 目标正确？</p></div><div class="trouble-action">失败 → 查设备授权、账号能力和转发配置。</div></div><div class="trouble-row"><span class="trouble-num">3</span><div><strong>DNS 解析</strong><p>外部网络能否得到域名对应地址？</p></div><div class="trouble-action">失败 → 比较独立网络和可信加密 DNS 结果。</div></div><div class="trouble-row"><span class="trouble-num">4</span><div><strong>TLS / HTTPS</strong><p>证书校验和 HTTPS 请求是否成功？</p></div><div class="trouble-action">失败 → 查证书申请状态、系统时间和网络。</div></div><div class="trouble-row"><span class="trouble-num">5</span><div><strong>账号与接口</strong><p>登录和受保护接口是否正常？</p></div><div class="trouble-action">401 → 查凭据；429 → 查登录限速。</div></div><div class="trouble-row"><span class="trouble-num">6</span><div><strong>实时业务</strong><p>WSS 能否持续收到监控消息？</p></div><div class="trouble-action">失败 → 查连接协议、鉴权和后端推送。</div></div></div><figcaption>图 3：不要用“网址打不开”概括所有错误。先确定失败在哪一层，再检查对应配置。通过私网 IP 的测试不能替代公网端到端验证。</figcaption></figure>
<h3 id="section-17">10.1 本地应用没有运行</h3>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Invoke-WebRequest &#39;http://127.0.0.1:9091/&#39; -UseBasicParsing -TimeoutSec 5</code></pre></div>
<p>如果失败，先检查应用进程、启动日志和端口。此时反复配置 Funnel 通常没有帮助。</p>
<h3 id="section-18">10.2 Tailscale 未授权或不在线</h3>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; status</code></pre></div>
<p>如果处于 <code>NeedsLogin</code>，按提示重新授权；如果有健康告警，先检查网络、账号策略和服务状态。</p>
<h3 id="section-19">10.3 证书还在申请</h3>
<p>状态可能提示：</p>
<div class="code-block"><div class="code-toolbar"><span>text</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-text">Fetching TLS certificate via ACME for: ...</code></pre></div>
<p>说明 HTTPS 证书尚未准备完成。检查主机系统时间，以及访问证书签发服务的出站网络情况。不要通过关闭 TLS 校验掩盖证书问题。</p>
<p>Windows 工具也可能报告证书吊销状态查询服务不可达。这和域名不匹配、证书过期是不同问题，应分别排查。</p>
<h3 id="section-20">10.4 DNS 没有返回公网地址</h3>
<p>在访问端执行：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">Resolve-DnsName web-host.example-tailnet.ts.net -Type A
Resolve-DnsName web-host.example-tailnet.ts.net -Type AAAA</code></pre></div>
<p>如果没有得到有效地址，浏览器可能提示域名不存在或无法解析。</p>
<p>注意区别：DNS 返回 <code>NXDOMAIN</code>，表示查询结果认为名称不存在；返回成功但没有 A/AAAA 记录，则是没有相应类型的地址结果。两者都可能导致当前连接无法建立，但不能混为同一种返回状态。</p>
<p>可进一步比较：</p>
<ul>
<li>不同网络的 DNS 查询结果。</li>
<li>可信 DNS 服务通过 HTTPS 查询返回的结果。</li>
<li>直接访问和经过现有代理访问的结果。</li>
</ul>
<p>多个 DNS 查询失败，也不一定证明全球均无法解析；查询路径可能受到相同网络环境影响。应结合独立网络或加密 DNS 的结果判断。</p>
<p>首次配置后可以等待并重试；如果持续失败，不应无限归因于“传播中”，应检查配置、解析路径及服务状态。</p>
<h3 id="section-21">10.5 用 <code>--resolve</code> 区分 DNS 故障与转发故障</h3>
<p>如果已经通过可信渠道查到了该域名的当前公网 IP，可以临时指定测试地址，同时保留原域名和证书验证：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">$publicHost = &#39;web-host.example-tailnet.ts.net&#39;
$publicAddress = &#39;203.0.113.10&#39;

curl.exe --noproxy &#39;*&#39; `
    --resolve &quot;${publicHost}:443:${publicAddress}&quot; `
    --connect-timeout 10 --max-time 25 `
    -o NUL -w &#39;HTTP=%{http_code} REMOTE=%{remote_ip} TLS=%{ssl_verify_result}&#39; `
    &quot;https://${publicHost}/&quot;</code></pre></div>
<p><strong><code>203.0.113.10</code> 是文档示例地址，不能实际连接。必须替换为该域名真实、当前的公网解析结果。</strong></p>
<p>如果默认解析失败，但上述测试成功，可以说明：</p>
<ul>
<li>访问端能够连接该公网入口。</li>
<li>域名对应的 HTTPS 证书验证正常。</li>
<li>隧道和后端应用具备可用的连接路径。</li>
<li>当前问题集中在 DNS 解析路径，而不是应用密码或本地端口。</li>
</ul>
<p>这种方式仅用于诊断。不要把入口 IP 当成永久地址，不要长期固定写入 hosts，因为公网入口可能变化。</p>
<h3 id="section-22">10.6 HTTPS 首页正常，登录或曲线失败</h3>
<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的表格"><table><thead><tr><th>现象</th><th>优先检查</th></tr></thead><tbody><tr><td>登录接口返回 <code>401</code></td><td>用户名、密码、旧自动填充内容</td></tr><tr><td>登录接口返回 <code>429</code></td><td>登录限速，稍后重试并查看应用策略</td></tr><tr><td>页面显示旧版本</td><td>缓存、静态资源版本号</td></tr><tr><td>页面正常，实时曲线不更新</td><td>WSS 地址、鉴权、握手和消息推送</td></tr><tr><td>重定向到内网地址</td><td>应用的外部 URL、代理头或回调配置</td></tr><tr><td>长请求或大文件失败</td><td>应用超时、代理行为、Funnel 当前限制和网络稳定性</td></tr></tbody></table></div>
<h2 id="section-23">十一、对外发布前的登录加固</h2>
<p>Funnel 不会自动检查你的后台是否使用弱密码。对具有设备控制、任务执行、文件上传等能力的管理界面，至少应完成以下工作：</p>
<ul>
<li>更换默认账号密码，使用独立且足够长的密码。</li>
<li>确认关键 API 和 WebSocket 均有鉴权。</li>
<li>为登录尝试增加合理的限速。</li>
<li>避免把密码、Bearer Token、WebSocket 认证参数写入公开日志。</li>
<li>根据实际需要限制对外提供的功能和用户权限。</li>
</ul>
<p>若部署时需要让旧会话失效，可以按应用支持的机制撤销会话；对于自建 JWT 应用，更换签名密钥会使旧令牌失效，但也会让现有用户需要重新登录，应明确安排。</p>
<p>限速应考虑反向代理：不能无条件信任客户端提交的 <code>X-Forwarded-For</code>，否则攻击者可能伪造来源地址绕过限制。全局限速实现简单，但会让所有用户共享额度；较复杂的应用通常需要结合账号、可信来源地址和失败次数设计策略。</p>
<p>如果服务只供少数可信人员使用，普通 Tailscale 私网访问的暴露范围更小；如果坚持浏览器免客户端访问，又需要应用登录之外的身份验证，应考虑额外身份网关或应用内多因素认证。</p>
<h2 id="section-24">十二、日常维护与关闭外网入口</h2>
<p>查看配置：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel status</code></pre></div>
<p>关闭 443 端口的 Funnel 转发：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel --https=443 off</code></pre></div>
<p>重新开启：</p>
<div class="code-block"><div class="code-toolbar"><span>powershell</span><button type="button" class="copy-code" hidden aria-label="复制此代码段">复制代码</button></div><pre tabindex="0"><code class="language-powershell">&amp; &#39;C:\Program Files\Tailscale\tailscale.exe&#39; funnel `
    --bg --https=443 http://127.0.0.1:9091</code></pre></div>
<p>只关闭 Funnel，不会自动停止 Web 应用。原有局域网访问可继续使用，前提是应用监听和防火墙允许。</p>
<p>长期运行还应关注主机休眠、网络变化、设备授权及密钥到期状态，以及 Tailscale 和应用版本更新。Funnel 依赖外部基础设施，不应未经压测就视为适合高带宽、高并发或严格可用性要求的生产入口。</p>
<h2 id="section-25">十三、部署验收清单</h2>
<ul>
<li><input disabled="" type="checkbox"> 主机本地 <code>127.0.0.1:9091</code> 正常。</li>
<li><input disabled="" type="checkbox"> Tailscale 设备已授权且在线。</li>
<li><input disabled="" type="checkbox"> HTTPS 与 Funnel 能力已启用。</li>
<li><input disabled="" type="checkbox"> Funnel 指向正确的本机端口。</li>
<li><input disabled="" type="checkbox"> Tailscale 和 Web 应用均具备开机运行机制。</li>
<li><input disabled="" type="checkbox"> 外部网络能够解析域名。</li>
<li><input disabled="" type="checkbox"> 外部 HTTPS 证书校验通过。</li>
<li><input disabled="" type="checkbox"> 正确密码可登录，未授权请求被拒绝。</li>
<li><input disabled="" type="checkbox"> 实时页面能持续收到 WSS 数据。</li>
<li><input disabled="" type="checkbox"> 已明确记录测试是否使用代理、私网路径或临时指定 IP。</li>
<li><input disabled="" type="checkbox"> 已验证关闭公网入口的方法。</li>
</ul>
<p>对教程或部署报告，应区分“Funnel 配置成功”“私网 HTTPS 测试通过”和“外网端到端验证通过”。只有真正从外部网络完成域名解析、HTTPS 连接、应用登录和业务交互，才能确认用户预期的访问方式已经可用。</p>
<h2 id="section-26">参考资料</h2>
<ul>
<li>Tailscale Funnel：<a href="https://tailscale.com/kb/1223/funnel">https://tailscale.com/kb/1223/funnel</a></li>
<li>Funnel CLI：<a href="https://tailscale.com/kb/1311/tailscale-funnel">https://tailscale.com/kb/1311/tailscale-funnel</a></li>
<li>Windows 无人值守运行：<a href="https://tailscale.com/kb/1088/run-unattended">https://tailscale.com/kb/1088/run-unattended</a></li>
<li>HTTPS 证书：<a href="https://tailscale.com/kb/1153/enabling-https">https://tailscale.com/kb/1153/enabling-https</a></li>
<li>Windows 下载：<a href="https://tailscale.com/download/windows">https://tailscale.com/download/windows</a></li>
</ul>
<p class="endnote">发布说明：D11 等名称用于说明集群角色；示例域名、地址和路径需替换后使用。图示采用内嵌 SVG，可直接在博客中缩放查看。</p>
{% endraw %}
</div>
