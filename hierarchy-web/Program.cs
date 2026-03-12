using System.Text;
using System.Text.Json;
using System.Collections.Concurrent;

// ─── Persistence + Audit ──────────────────────────────────────────────────────
var auditEntries = new List<AuditEntry>();
var (store, loadedAudit) = Persistence.Load();
foreach (var e in loadedAudit) auditEntries.Add(e);

void AddAudit(string action, string nodeType, string nodeName)
{
    auditEntries.Insert(0, new AuditEntry(DateTime.UtcNow, action, nodeType, nodeName));
    if (auditEntries.Count > 200) auditEntries.RemoveAt(auditEntries.Count - 1);
}
void Save() => Persistence.Save(store, auditEntries);

// ─── Helpers ──────────────────────────────────────────────────────────────────
Bilgisayar? FindPC(Guid id)
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                foreach (var o in b.Children)
                    foreach (var pc in o.Children)
                        if (pc.Id == id) return pc;
    return null;
}

Oda? FindOda(Guid id)
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                foreach (var o in b.Children)
                    if (o.Id == id) return o;
    return null;
}

Eklenti? FindEklenti(Guid id)
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                foreach (var o in b.Children)
                    foreach (var pc in o.Children)
                        foreach (var e in pc.Children)
                            if (e.Id == id) return e;
    return null;
}

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.UseCors();

// ─── Serve UI ─────────────────────────────────────────────────────────────────
app.MapGet("/", () => Results.Content(HtmlPage.Content, "text/html"));

// ─── REST API ─────────────────────────────────────────────────────────────────

app.MapGet("/api/tree", () =>
{
    var result = store.Holdings.Values.Select(h => new
    {
        h.Id, h.Name, h.Path,
        children = h.Children.Select(k => new
        {
            k.Id, k.Name, k.Path, parentId = k.ParentId,
            children = k.Children.Select(b => new
            {
                b.Id, b.Name, b.Path, parentId = b.ParentId,
                children = b.Children.Select(o => new
                {
                    o.Id, o.Name, o.Path, parentId = o.ParentId,
                    children = o.Children.Select(pc => new
                    {
                        pc.Id, pc.Name, pc.Path, parentId = pc.ParentId, pc.LinkedAssetId,
                        children = pc.Children.Select(e => new { e.Id, e.Name, e.Path, parentId = e.ParentId })
                    })
                })
            })
        })
    });
    return Results.Ok(result);
});

app.MapPost("/api/holding", (CreateReq req) =>
{
    var h = new Holding(req.Name);
    store.Holdings[h.Id] = h;
    AddAudit("create", "holding", h.Name);
    Save();
    return Results.Ok(new { h.Id, h.Name, h.Path });
});

app.MapPost("/api/kanal", (CreateChildReq req) =>
{
    if (!store.Holdings.TryGetValue(req.ParentId, out var parent))
        return Results.NotFound($"Holding {req.ParentId} bulunamadi");
    var k = new Kanal(parent, req.Name);
    AddAudit("create", "kanal", k.Name);
    Save();
    return Results.Ok(new { k.Id, k.Name, k.Path });
});

app.MapPost("/api/bina", (CreateChildReq req) =>
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            if (k.Id == req.ParentId)
            {
                var b = new Bina(k, req.Name);
                AddAudit("create", "bina", b.Name);
                Save();
                return Results.Ok(new { b.Id, b.Name, b.Path });
            }
    return Results.NotFound($"Kanal {req.ParentId} bulunamadi");
});

app.MapPost("/api/oda", (CreateChildReq req) =>
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                if (b.Id == req.ParentId)
                {
                    var o = new Oda(b, req.Name);
                    AddAudit("create", "oda", o.Name);
                    Save();
                    return Results.Ok(new { o.Id, o.Name, o.Path });
                }
    return Results.NotFound($"Bina {req.ParentId} bulunamadi");
});

app.MapPost("/api/bilgisayar", (CreateChildReq req) =>
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                foreach (var o in b.Children)
                    if (o.Id == req.ParentId)
                    {
                        var pc = new Bilgisayar(o, req.Name);
                        pc.Payload = Encoding.UTF8.GetBytes($"{{\"name\":\"{req.Name}\",\"status\":\"online\"}}");
                        AddAudit("create", "bilgisayar", pc.Name);
                        Save();
                        return Results.Ok(new { pc.Id, pc.Name, pc.Path });
                    }
    return Results.NotFound($"Oda {req.ParentId} bulunamadi");
});

app.MapPost("/api/eklenti", (CreateChildReq req) =>
{
    foreach (var h in store.Holdings.Values)
        foreach (var k in h.Children)
            foreach (var b in k.Children)
                foreach (var o in b.Children)
                    foreach (var pc in o.Children)
                        if (pc.Id == req.ParentId)
                        {
                            var e = new Eklenti(pc, req.Name);
                            AddAudit("create", "eklenti", e.Name);
                            Save();
                            return Results.Ok(new { e.Id, e.Name, e.Path });
                        }
    return Results.NotFound($"Bilgisayar {req.ParentId} bulunamadi");
});

app.MapGet("/api/packet/{id:guid}", (Guid id) =>
{
    var pc = FindPC(id);
    if (pc == null) return Results.NotFound($"Bilgisayar {id} bulunamadi");
    var packet = DataPacket.BuildPacket(pc);
    ushort crc = (ushort)((packet[^2] << 8) | packet[^1]);
    return Results.Ok(new
    {
        totalBytes = packet.Length,
        header     = "0x20 0x01 0x21",
        path       = pc.Path,
        crc16      = $"0x{crc:X4}",
        hexDump    = Convert.ToHexString(packet)
    });
});

app.MapDelete("/api/{type}/{id:guid}", (string type, Guid id) =>
{
    switch (type.ToLower())
    {
        case "holding":
            if (store.Holdings.TryGetValue(id, out var h))
            { AddAudit("delete", "holding", h.Name); HierarchyManager.Delete(h); store.Holdings.TryRemove(id, out _); Save(); return Results.Ok("Holding silindi."); }
            break;
        case "kanal":
            foreach (var hh in store.Holdings.Values)
                foreach (var k in new List<Kanal>(hh.Children))
                    if (k.Id == id) { AddAudit("delete", "kanal", k.Name); HierarchyManager.Delete(k); Save(); return Results.Ok("Kanal silindi."); }
            break;
        case "bina":
            foreach (var hh in store.Holdings.Values)
                foreach (var k in hh.Children)
                    foreach (var b in new List<Bina>(k.Children))
                        if (b.Id == id) { AddAudit("delete", "bina", b.Name); HierarchyManager.Delete(b); Save(); return Results.Ok("Bina silindi."); }
            break;
        case "oda":
            foreach (var hh in store.Holdings.Values)
                foreach (var k in hh.Children)
                    foreach (var b in k.Children)
                        foreach (var o in new List<Oda>(b.Children))
                            if (o.Id == id) { AddAudit("delete", "oda", o.Name); HierarchyManager.Delete(o); Save(); return Results.Ok("Oda silindi."); }
            break;
        case "bilgisayar":
            foreach (var hh in store.Holdings.Values)
                foreach (var k in hh.Children)
                    foreach (var b in k.Children)
                        foreach (var o in b.Children)
                            foreach (var pc in new List<Bilgisayar>(o.Children))
                                if (pc.Id == id) { AddAudit("delete", "bilgisayar", pc.Name); HierarchyManager.Delete(pc); Save(); return Results.Ok("Bilgisayar silindi."); }
            break;
        case "eklenti":
            foreach (var hh in store.Holdings.Values)
                foreach (var k in hh.Children)
                    foreach (var b in k.Children)
                        foreach (var o in b.Children)
                            foreach (var pc in o.Children)
                                foreach (var e in new List<Eklenti>(pc.Children))
                                    if (e.Id == id) { AddAudit("delete", "eklenti", e.Name); HierarchyManager.Delete(e); Save(); return Results.Ok("Eklenti silindi."); }
            break;
    }
    return Results.NotFound($"{type} {id} bulunamadi");
});

// ─── Move endpoint ────────────────────────────────────────────────────────────
app.MapPost("/api/move", (MoveReq req) =>
{
    switch (req.NodeType.ToLower())
    {
        case "bilgisayar":
            var pc = FindPC(req.NodeId);
            if (pc == null) return Results.NotFound("Bilgisayar bulunamadi");
            var newOda = FindOda(req.NewParentId);
            if (newOda == null) return Results.NotFound("Hedef Oda bulunamadi");
            HierarchyManager.Move(pc, newOda);
            AddAudit("move", "bilgisayar", pc.Name);
            Save();
            return Results.Ok(new { pc.Id, pc.Name, pc.Path });
        case "eklenti":
            var ek = FindEklenti(req.NodeId);
            if (ek == null) return Results.NotFound("Eklenti bulunamadi");
            var newPc = FindPC(req.NewParentId);
            if (newPc == null) return Results.NotFound("Hedef Bilgisayar bulunamadi");
            HierarchyManager.Move(ek, newPc);
            AddAudit("move", "eklenti", ek.Name);
            Save();
            return Results.Ok(new { ek.Id, ek.Name, ek.Path });
        default:
            return Results.BadRequest("Sadece bilgisayar ve eklenti tasinabilir");
    }
});

// ─── Link endpoint ────────────────────────────────────────────────────────────
app.MapPost("/api/bilgisayar/{id:guid}/link", (Guid id, LinkReq req) =>
{
    var pc = FindPC(id);
    if (pc == null) return Results.NotFound("Bilgisayar bulunamadi");
    pc.LinkedAssetId = req.AssetId;
    AddAudit(req.AssetId.HasValue ? "link" : "unlink", "bilgisayar", pc.Name);
    Save();
    return Results.Ok(new { pc.Id, pc.LinkedAssetId });
});

// ─── Audit-log endpoint ───────────────────────────────────────────────────────
app.MapGet("/api/audit-log", () =>
    Results.Ok(auditEntries.Select(e => new
    {
        timestamp = e.Timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        e.Action, e.NodeType, e.NodeName
    })));

app.MapPost("/api/demo", () =>
{
    store.Holdings.Clear();

    // ═══════════════════════════════════════════════════════════════
    // ISOFTASSETHUB — Yazılım Platformu
    //   Bağımsız Kanallar + Demirören Medya Holding + Turkuaz Medya Holding
    //   Holding → Kanal → Bina → Oda → Bilgisayar → Eklenti
    // ═══════════════════════════════════════════════════════════════

    // ── Bağımsız Kanallar (holding'e bağlı olmayan) ─────────────────
    var bagimsilar = new Holding("Bağımsız Kanallar");
    store.Holdings[bagimsilar.Id] = bagimsilar;

    // ── 1. TRT ──────────────────────────────────────────────────────
    var trt     = new Kanal(bagimsilar, "TRT");
    var trtBina = new Bina(trt, "TRT Yayın Merkezi - Ankara");

    var trtPlayOda = new Oda(trtBina, "Playout Odası");
    var trtGPU1 = new Bilgisayar(trtPlayOda, "GPU Tesla V100 #001");
    trtGPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Tesla V100 32GB\",\"ip\":\"10.1.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var trtGPU2 = new Bilgisayar(trtPlayOda, "GPU RTX 4090 #002");
    trtGPU2.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4090 24GB\",\"ip\":\"10.1.1.102\",\"rack\":\"Rack-A1-U3\",\"status\":\"Active\"}");
    var trtPlay1 = new Bilgisayar(trtPlayOda, "Playout Server #001");
    trtPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R850\",\"ip\":\"10.1.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");
    _ = new Eklenti(trtPlay1, "GPU Tesla V100 (Embedded)");
    _ = new Eklenti(trtPlay1, "RAM DDR4 64GB #1");
    _ = new Eklenti(trtPlay1, "NIC 10GbE #1");
    _ = new Eklenti(trtPlay1, "PSU 1200W #1");

    var trtEncOda = new Oda(trtBina, "Encoding Odası");
    var trtEnc1 = new Bilgisayar(trtEncOda, "Encoder Server #001");
    trtEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R760\",\"ip\":\"10.1.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    _ = new Eklenti(trtEnc1, "GPU A100 (Embedded)");
    _ = new Eklenti(trtEnc1, "RAM DDR4 128GB #1");
    _ = new Eklenti(trtEnc1, "Storage SSD 2TB #1");
    var trtA100 = new Bilgisayar(trtEncOda, "GPU A100 #001");
    trtA100.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA A100 80GB\",\"ip\":\"10.1.2.102\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");

    var trtTrnOda = new Oda(trtBina, "İletim Odası");
    var trtSwitch = new Bilgisayar(trtTrnOda, "Network Switch #001");
    trtSwitch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco Nexus 9300\",\"ip\":\"10.1.3.1\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var trtRouter = new Bilgisayar(trtTrnOda, "Network Router #001");
    trtRouter.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Juniper QFX5120\",\"ip\":\"10.1.3.2\",\"rack\":\"Rack-C1-U3\",\"status\":\"Active\"}");

    var trtArcOda = new Oda(trtBina, "Arşiv Odası");
    var trtArc = new Bilgisayar(trtArcOda, "Archive Storage #001");
    trtArc.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NetApp FAS2720\",\"ip\":\"10.1.4.101\",\"rack\":\"Rack-D1-U1\",\"status\":\"Active\"}");

    var trtStrOda = new Oda(trtBina, "Depolama Odası");
    var trtNas = new Bilgisayar(trtStrOda, "NAS Storage #001");
    trtNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Synology RS3621XS+\",\"ip\":\"10.1.5.101\",\"rack\":\"Rack-E1-U1\",\"status\":\"Active\"}");
    _ = new Eklenti(trtNas, "HDD 16TB #1");
    _ = new Eklenti(trtNas, "HDD 16TB #2");
    _ = new Eklenti(trtNas, "RAM DDR4 32GB #1");
    var trtSan = new Bilgisayar(trtStrOda, "SAN Storage #001");
    trtSan.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Pure Storage FlashArray\",\"ip\":\"10.1.5.102\",\"rack\":\"Rack-E1-U3\",\"status\":\"Maintenance\"}");
    var trtDC1 = new Bilgisayar(trtStrOda, "DisplayCard RTX 4080 #001");
    trtDC1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4080 16GB\",\"ip\":\"10.1.5.111\",\"rack\":\"Rack-E2-U1\",\"status\":\"Active\"}");
    var trtDC2 = new Bilgisayar(trtStrOda, "DisplayCard RTX 4070 #001");
    trtDC2.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4070 12GB\",\"ip\":\"10.1.5.112\",\"rack\":\"Rack-E2-U3\",\"status\":\"Active\"}");

    // ── 2. Ekol TV ──────────────────────────────────────────────────
    var ekol     = new Kanal(bagimsilar, "Ekol TV");
    var ekolBina = new Bina(ekol, "Ekol TV Yayın Merkezi - İstanbul");

    var ekolPlayOda = new Oda(ekolBina, "Playout Odası");
    var ekolGPU     = new Bilgisayar(ekolPlayOda, "GPU RTX 4080 #001");
    ekolGPU.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4080 16GB\",\"ip\":\"10.3.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var ekolPlay1   = new Bilgisayar(ekolPlayOda, "Playout Server #001");
    ekolPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R640\",\"ip\":\"10.3.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var ekolEncOda = new Oda(ekolBina, "Encoding Odası");
    var ekolEnc1   = new Bilgisayar(ekolEncOda, "Encoder Server #001");
    ekolEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Lenovo ThinkSystem SR650\",\"ip\":\"10.3.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Faulty\"}");

    var ekolStrOda = new Oda(ekolBina, "Depolama Odası");
    var ekolNas    = new Bilgisayar(ekolStrOda, "NAS Storage #001");
    ekolNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell EMC PowerStore 3000T\",\"ip\":\"10.3.3.101\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var ekolDC     = new Bilgisayar(ekolStrOda, "DisplayCard RTX 4090 #001");
    ekolDC.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4090 24GB\",\"ip\":\"10.3.3.111\",\"rack\":\"Rack-C2-U1\",\"status\":\"Active\"}");

    // ── 3. CNBC-e ───────────────────────────────────────────────────
    var cnbce   = new Kanal(bagimsilar, "CNBC-e");
    var cnbBina = new Bina(cnbce, "CNBC-e Yayın Merkezi - İstanbul");

    var cnbPlayOda = new Oda(cnbBina, "Playout Odası");
    var cnbA100    = new Bilgisayar(cnbPlayOda, "GPU A100 #001");
    cnbA100.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA A100 80GB\",\"ip\":\"10.5.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var cnbPlay1   = new Bilgisayar(cnbPlayOda, "Playout Server #001");
    cnbPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R740\",\"ip\":\"10.5.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var cnbTrnOda  = new Oda(cnbBina, "İletim Odası");
    var cnbSwitch  = new Bilgisayar(cnbTrnOda, "Network Switch #001");
    cnbSwitch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco Catalyst 9500\",\"ip\":\"10.5.2.1\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var cnbRouter  = new Bilgisayar(cnbTrnOda, "Network Router #001");
    cnbRouter.Payload = Encoding.UTF8.GetBytes("{\"model\":\"MikroTik CRS354\",\"ip\":\"10.5.2.2\",\"rack\":\"Rack-B1-U3\",\"status\":\"Inactive\"}");

    var cnbStrOda  = new Oda(cnbBina, "Depolama Odası");
    var cnbSan     = new Bilgisayar(cnbStrOda, "SAN Storage #001");
    cnbSan.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Pure Storage FlashArray\",\"ip\":\"10.5.3.101\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var cnbDC      = new Bilgisayar(cnbStrOda, "DisplayCard RTX 3060 #001");
    cnbDC.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"RTX 3060 12GB\",\"ip\":\"10.5.3.111\",\"rack\":\"Rack-C2-U1\",\"status\":\"Active\"}");

    // ── 4. Now TV ───────────────────────────────────────────────────
    var nowTv   = new Kanal(bagimsilar, "Now TV");
    var nowBina = new Bina(nowTv, "Now TV Yayın Merkezi - İstanbul");

    var nowPlayOda = new Oda(nowBina, "Playout Odası");
    var nowGPU     = new Bilgisayar(nowPlayOda, "GPU RTX 4090 #001");
    nowGPU.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4090 24GB\",\"ip\":\"10.6.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var nowPlay1   = new Bilgisayar(nowPlayOda, "Playout Server #001");
    nowPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Lenovo ThinkSystem SR630\",\"ip\":\"10.6.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var nowEncOda = new Oda(nowBina, "Encoding Odası");
    var nowEnc1   = new Bilgisayar(nowEncOda, "Encoder Server #001");
    nowEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R760\",\"ip\":\"10.6.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");

    var nowStrOda = new Oda(nowBina, "Depolama Odası");
    var nowNas    = new Bilgisayar(nowStrOda, "NAS Storage #001");
    nowNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Synology RS3621XS+\",\"ip\":\"10.6.3.101\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");

    // ── 5. Digiturk ─────────────────────────────────────────────────
    var digiturk = new Kanal(bagimsilar, "Digiturk");
    var dgtBina  = new Bina(digiturk, "Digiturk Yayın Merkezi - İstanbul");

    var dgtPlayOda = new Oda(dgtBina, "Playout Odası");
    var dgtV100    = new Bilgisayar(dgtPlayOda, "GPU Tesla V100 #001");
    dgtV100.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Tesla V100 32GB\",\"ip\":\"10.7.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Maintenance\"}");
    var dgtPlay1   = new Bilgisayar(dgtPlayOda, "Playout Server #001");
    dgtPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R850\",\"ip\":\"10.7.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");
    _ = new Eklenti(dgtPlay1, "GPU Tesla V100 (Embedded)");
    _ = new Eklenti(dgtPlay1, "RAM DDR4 256GB #1");
    _ = new Eklenti(dgtPlay1, "NIC 25GbE #1");

    var dgtEncOda = new Oda(dgtBina, "Encoding Odası");
    var dgtEnc1   = new Bilgisayar(dgtEncOda, "Encoder Server #001");
    dgtEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HPE ProLiant DL360 Gen10\",\"ip\":\"10.7.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");

    var dgtTrnOda  = new Oda(dgtBina, "İletim Odası");
    var dgtRouter  = new Bilgisayar(dgtTrnOda, "Uplink Router #001");
    dgtRouter.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco Nexus 9300\",\"ip\":\"10.7.3.1\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");

    var dgtArcOda = new Oda(dgtBina, "Arşiv Odası");
    var dgtArc    = new Bilgisayar(dgtArcOda, "Archive Storage #001");
    dgtArc.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NetApp AFF A250\",\"ip\":\"10.7.4.101\",\"rack\":\"Rack-D1-U1\",\"status\":\"Active\"}");

    var dgtStrOda = new Oda(dgtBina, "Depolama Odası");
    var dgtSan    = new Bilgisayar(dgtStrOda, "SAN Storage #001");
    dgtSan.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Pure Storage FlashArray\",\"ip\":\"10.7.5.101\",\"rack\":\"Rack-E1-U1\",\"status\":\"Active\"}");
    var dgtDC     = new Bilgisayar(dgtStrOda, "DisplayCard RTX 4080 #001");
    dgtDC.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4080 16GB\",\"ip\":\"10.7.5.111\",\"rack\":\"Rack-E2-U1\",\"status\":\"Active\"}");

    // ── 6. TGRT Haber ───────────────────────────────────────────────
    var tgrt     = new Kanal(bagimsilar, "TGRT Haber");
    var tgrtBina = new Bina(tgrt, "TGRT Haber Yayın Merkezi - İstanbul");

    var tgrtPlayOda = new Oda(tgrtBina, "Playout Odası");
    var tgrtA5000   = new Bilgisayar(tgrtPlayOda, "GPU RTX A5000 #001");
    tgrtA5000.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA RTX A5000\",\"ip\":\"10.8.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var tgrtPlay1   = new Bilgisayar(tgrtPlayOda, "Playout Server #001");
    tgrtPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R740\",\"ip\":\"10.8.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var tgrtEncOda = new Oda(tgrtBina, "Encoding Odası");
    var tgrtEnc1   = new Bilgisayar(tgrtEncOda, "Encoder Server #001");
    tgrtEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Lenovo ThinkSystem SR650\",\"ip\":\"10.8.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");

    var tgrtStrOda = new Oda(tgrtBina, "Depolama Odası");
    var tgrtNas    = new Bilgisayar(tgrtStrOda, "NAS Storage #001");
    tgrtNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell EMC PowerStore 1000T\",\"ip\":\"10.8.3.101\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var tgrtDC     = new Bilgisayar(tgrtStrOda, "DisplayCard RTX 3080 #001");
    tgrtDC.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 3080 10GB\",\"ip\":\"10.8.3.111\",\"rack\":\"Rack-C2-U1\",\"status\":\"Active\"}");

    // ═══════════════════════════════════════════════════════════════
    // Demirören Medya Holding
    // ═══════════════════════════════════════════════════════════════
    var dmrHolding = new Holding("Demirören Medya");
    store.Holdings[dmrHolding.Id] = dmrHolding;

    // ── Demirören Medya (kanal) ──────────────────────────────────────
    var demioren = new Kanal(dmrHolding, "Demirören Medya");
    var dmrBina  = new Bina(demioren, "Demirören Medya Yayın Merkezi - İstanbul");

    var dmrPlayOda = new Oda(dmrBina, "Playout Odası");
    var dmrT4      = new Bilgisayar(dmrPlayOda, "GPU Tesla T4 #001");
    dmrT4.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA Tesla T4\",\"ip\":\"10.4.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var dmrPlay1   = new Bilgisayar(dmrPlayOda, "Playout Server #001");
    dmrPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R650\",\"ip\":\"10.4.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var dmrEncOda = new Oda(dmrBina, "Encoding Odası");
    var dmrEnc1   = new Bilgisayar(dmrEncOda, "Encoder Server #001");
    dmrEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HPE ProLiant DL380 Gen10\",\"ip\":\"10.4.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var dmrA4000  = new Bilgisayar(dmrEncOda, "GPU A4000 #001");
    dmrA4000.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA RTX A4000\",\"ip\":\"10.4.2.102\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");

    var dmrArcOda = new Oda(dmrBina, "Arşiv Odası");
    var dmrArc    = new Bilgisayar(dmrArcOda, "Archive Server #001");
    dmrArc.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NetApp AFF A250\",\"ip\":\"10.4.3.101\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var dmrDC     = new Bilgisayar(dmrArcOda, "DisplayCard RTX 3070 #001");
    dmrDC.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 3070 8GB\",\"ip\":\"10.4.3.111\",\"rack\":\"Rack-C2-U1\",\"status\":\"Active\"}");

    // ── Kanal D ─────────────────────────────────────────────────────
    var kanalD     = new Kanal(dmrHolding, "Kanal D");
    var kdBina     = new Bina(kanalD, "Kanal D Merkez Bina - Kavacık");
    var kdPlayOda  = new Oda(kdBina, "Yayın Kontrol Odası");
    var kdPlay1    = new Bilgisayar(kdPlayOda, "Playout Server #001");
    kdPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HP ProLiant DL380\",\"ip\":\"10.9.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var kdGPU1     = new Bilgisayar(kdPlayOda, "GPU RTX 4090 #001");
    kdGPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4090 24GB\",\"ip\":\"10.9.1.102\",\"rack\":\"Rack-A1-U2\",\"status\":\"Active\"}");
    var kdEnc1     = new Bilgisayar(kdPlayOda, "Encoder Server #001");
    kdEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R750\",\"ip\":\"10.9.1.103\",\"rack\":\"Rack-A1-U3\",\"status\":\"Active\"}");
    var kdTekOda   = new Oda(kdBina, "Teknik Altyapı Odası");
    var kdSwitch   = new Bilgisayar(kdTekOda, "Network Switch #001");
    kdSwitch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco Catalyst 9300\",\"ip\":\"10.9.1.201\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");
    var kdNas      = new Bilgisayar(kdTekOda, "NAS Storage #001");
    kdNas.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"Synology RS3621xs+\",\"ip\":\"10.9.1.202\",\"rack\":\"Rack-C1-U3\",\"status\":\"Active\"}");
    var kdDC       = new Bilgisayar(kdTekOda, "DisplayCard RTX 4080 #001");
    kdDC.Payload   = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4080 16GB\",\"ip\":\"10.9.1.203\",\"rack\":\"Rack-C1-U5\",\"status\":\"Active\"}");

    // ── CNN Türk ────────────────────────────────────────────────────
    var cnnTurk    = new Kanal(dmrHolding, "CNN Türk");
    var cnnBina    = new Bina(cnnTurk, "CNN Türk Merkez Bina - Kavacık");
    var cnnPlayOda = new Oda(cnnBina, "Yayın Kontrol Odası");
    var cnnPlay1   = new Bilgisayar(cnnPlayOda, "Playout Server #001");
    cnnPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HP ProLiant DL360\",\"ip\":\"10.10.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var cnnGPU1    = new Bilgisayar(cnnPlayOda, "GPU A100 #001");
    cnnGPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"A100 80GB\",\"ip\":\"10.10.1.102\",\"rack\":\"Rack-A1-U2\",\"status\":\"Active\"}");
    var cnnEnc1    = new Bilgisayar(cnnPlayOda, "Live Encoder #001");
    cnnEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"SuperMicro 6029P\",\"ip\":\"10.10.1.103\",\"rack\":\"Rack-A1-U3\",\"status\":\"Maintenance\"}");
    var cnnTekOda  = new Oda(cnnBina, "Teknik Altyapı Odası");
    var cnnRouter  = new Bilgisayar(cnnTekOda, "Network Router #001");
    cnnRouter.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Juniper MX204\",\"ip\":\"10.10.1.201\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var cnnSan     = new Bilgisayar(cnnTekOda, "SAN Storage #001");
    cnnSan.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NetApp AFF A400\",\"ip\":\"10.10.1.202\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");
    var cnnUps     = new Bilgisayar(cnnTekOda, "UPS #001");
    cnnUps.Payload = Encoding.UTF8.GetBytes("{\"model\":\"APC Smart-UPS 3000\",\"ip\":\"10.10.1.203\",\"rack\":\"Rack-B1-U6\",\"status\":\"Active\"}");

    // ═══════════════════════════════════════════════════════════════
    // Turkuaz Medya Holding
    // ═══════════════════════════════════════════════════════════════
    var turkHolding = new Holding("Turkuaz Medya");
    store.Holdings[turkHolding.Id] = turkHolding;

    // ── Turkuaz Medya (kanal) ────────────────────────────────────────
    var turkuaz     = new Kanal(turkHolding, "Turkuaz Medya");
    var turkBina    = new Bina(turkuaz, "Turkuaz Medya Yayın Merkezi - İstanbul");

    var turkPlayOda = new Oda(turkBina, "Playout Odası");
    var turkA6000   = new Bilgisayar(turkPlayOda, "GPU A6000 #001");
    turkA6000.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA RTX A6000\",\"ip\":\"10.2.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var turkPlay1   = new Bilgisayar(turkPlayOda, "Playout Server #001");
    turkPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HPE ProLiant DL380 Gen10\",\"ip\":\"10.2.1.201\",\"rack\":\"Rack-A2-U1\",\"status\":\"Active\"}");

    var turkEncOda  = new Oda(turkBina, "Encoding Odası");
    var turkEnc1    = new Bilgisayar(turkEncOda, "Encoder Server #001");
    turkEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R750\",\"ip\":\"10.2.2.101\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var turkA5000   = new Bilgisayar(turkEncOda, "GPU A5000 #001");
    turkA5000.Payload = Encoding.UTF8.GetBytes("{\"model\":\"NVIDIA RTX A5000\",\"ip\":\"10.2.2.102\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");

    var turkTrnOda  = new Oda(turkBina, "İletim Odası");
    var turkSwitch  = new Bilgisayar(turkTrnOda, "Network Switch #001");
    turkSwitch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Arista 7050CX3\",\"ip\":\"10.2.3.1\",\"rack\":\"Rack-C1-U1\",\"status\":\"Active\"}");

    var turkStrOda  = new Oda(turkBina, "Depolama Odası");
    var turkNas     = new Bilgisayar(turkStrOda, "NAS Storage #001");
    turkNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Synology RS3621XS+\",\"ip\":\"10.2.4.101\",\"rack\":\"Rack-D1-U1\",\"status\":\"Active\"}");
    var turkDC      = new Bilgisayar(turkStrOda, "DisplayCard RTX 3080 #001");
    turkDC.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"RTX 3080 10GB\",\"ip\":\"10.2.4.111\",\"rack\":\"Rack-D2-U1\",\"status\":\"Active\"}");

    // ── ATV ─────────────────────────────────────────────────────────
    var atv        = new Kanal(turkHolding, "ATV");
    var atvBina    = new Bina(atv, "ATV Merkez Bina - Esenyurt");
    var atvPlayOda = new Oda(atvBina, "Yayın Kontrol Odası");
    var atvPlay1   = new Bilgisayar(atvPlayOda, "Playout Server #001");
    atvPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R740\",\"ip\":\"10.11.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var atvGPU1    = new Bilgisayar(atvPlayOda, "GPU RTX 4080 #001");
    atvGPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4080 16GB\",\"ip\":\"10.11.1.102\",\"rack\":\"Rack-A1-U2\",\"status\":\"Active\"}");
    var atvEnc1    = new Bilgisayar(atvPlayOda, "Encoder Server #001");
    atvEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HP ProLiant DL380\",\"ip\":\"10.11.1.103\",\"rack\":\"Rack-A1-U3\",\"status\":\"Active\"}");
    var atvTekOda  = new Oda(atvBina, "Teknik Altyapı Odası");
    var atvSwitch  = new Bilgisayar(atvTekOda, "Network Switch #001");
    atvSwitch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco Catalyst 9200\",\"ip\":\"10.11.1.201\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var atvNas     = new Bilgisayar(atvTekOda, "NAS Storage #001");
    atvNas.Payload = Encoding.UTF8.GetBytes("{\"model\":\"QNAP TS-h1683XU\",\"ip\":\"10.11.1.202\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");
    var atvDC      = new Bilgisayar(atvTekOda, "DisplayCard RTX 4070 #001");
    atvDC.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"RTX 4070 12GB\",\"ip\":\"10.11.1.203\",\"rack\":\"Rack-B1-U5\",\"status\":\"Active\"}");

    // ── A2 ──────────────────────────────────────────────────────────
    var a2         = new Kanal(turkHolding, "A2");
    var a2Bina     = new Bina(a2, "A2 Teknik Bina - Esenyurt");
    var a2PlayOda  = new Oda(a2Bina, "Yayın Kontrol Odası");
    var a2Play1    = new Bilgisayar(a2PlayOda, "Playout Server #001");
    a2Play1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R640\",\"ip\":\"10.12.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var a2GPU1     = new Bilgisayar(a2PlayOda, "GPU Tesla T4 #001");
    a2GPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Tesla T4 16GB\",\"ip\":\"10.12.1.102\",\"rack\":\"Rack-A1-U2\",\"status\":\"Active\"}");
    var a2Enc1     = new Bilgisayar(a2PlayOda, "Encoder Server #001");
    a2Enc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Lenovo ThinkSystem SR650\",\"ip\":\"10.12.1.103\",\"rack\":\"Rack-A1-U3\",\"status\":\"Maintenance\"}");
    var a2TekOda   = new Oda(a2Bina, "Teknik Altyapı Odası");
    var a2Switch   = new Bilgisayar(a2TekOda, "Network Switch #001");
    a2Switch.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HPE Aruba 2930F\",\"ip\":\"10.12.1.201\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var a2Arc      = new Bilgisayar(a2TekOda, "Archive Storage #001");
    a2Arc.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"Western Digital 100TB\",\"ip\":\"10.12.1.202\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");

    // ── A Haber ─────────────────────────────────────────────────────
    var aHaber     = new Kanal(turkHolding, "A Haber");
    var ahBina     = new Bina(aHaber, "A Haber Merkez Bina - Esenyurt");
    var ahPlayOda  = new Oda(ahBina, "Yayın Kontrol Odası");
    var ahPlay1    = new Bilgisayar(ahPlayOda, "Playout Server #001");
    ahPlay1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"HP ProLiant DL380 G10\",\"ip\":\"10.13.1.101\",\"rack\":\"Rack-A1-U1\",\"status\":\"Active\"}");
    var ahGPU1     = new Bilgisayar(ahPlayOda, "GPU RTX 3090 #001");
    ahGPU1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"RTX 3090 24GB\",\"ip\":\"10.13.1.102\",\"rack\":\"Rack-A1-U2\",\"status\":\"Active\"}");
    var ahEnc1     = new Bilgisayar(ahPlayOda, "Live News Encoder #001");
    ahEnc1.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Dell PowerEdge R750xa\",\"ip\":\"10.13.1.103\",\"rack\":\"Rack-A1-U3\",\"status\":\"Active\"}");
    var ahTekOda   = new Oda(ahBina, "Teknik Altyapı Odası");
    var ahRouter   = new Bilgisayar(ahTekOda, "Network Router #001");
    ahRouter.Payload = Encoding.UTF8.GetBytes("{\"model\":\"Cisco ASR 1002-X\",\"ip\":\"10.13.1.201\",\"rack\":\"Rack-B1-U1\",\"status\":\"Active\"}");
    var ahSan      = new Bilgisayar(ahTekOda, "SAN Storage #001");
    ahSan.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"Pure Storage FlashArray\",\"ip\":\"10.13.1.202\",\"rack\":\"Rack-B1-U3\",\"status\":\"Active\"}");
    var ahUps      = new Bilgisayar(ahTekOda, "UPS #001");
    ahUps.Payload  = Encoding.UTF8.GetBytes("{\"model\":\"Eaton 9PX 3000i\",\"ip\":\"10.13.1.203\",\"rack\":\"Rack-B1-U6\",\"status\":\"Active\"}");

    AddAudit("demo", "system", "Demo veri yuklendi");
    Save();
    return Results.Ok("ISOFTASSETHUB veri yüklendi: 3 Grup (Bağımsız+Demirören+Turkuaz) · 13 Kanal · 13 Bina · 50+ Bilgisayar");
});

app.Run("http://localhost:5050");

// ─── DTOs ─────────────────────────────────────────────────────────────────────
record CreateReq(string Name);
record CreateChildReq(Guid ParentId, string Name);
record MoveReq(string NodeType, Guid NodeId, Guid NewParentId);
record LinkReq(int? AssetId);
record AuditEntry(DateTime Timestamp, string Action, string NodeType, string NodeName);

class HierarchyStore
{
    public ConcurrentDictionary<Guid, Holding> Holdings { get; } = new();
}

// ─── MODELS ───────────────────────────────────────────────────────────────────
class Holding
{
    public Guid   Id   { get; init; } = Guid.NewGuid();
    public string Name { get; set; }
    public string Path => Id.ToString();
    public List<Kanal> Children { get; } = new();
    public Holding(string name) { Name = name; }
}

class Kanal
{
    public Guid    Id       { get; init; } = Guid.NewGuid();
    public string  Name     { get; set; }
    public Holding Parent   { get; }
    public Guid    ParentId => Parent.Id;
    public string  Path     => $"{Parent.Id}/{Id}";
    public List<Bina> Children { get; } = new();
    public Kanal(Holding parent, string name)
    { Parent = parent ?? throw new ArgumentNullException(nameof(parent)); Name = name; parent.Children.Add(this); }
}

class Bina
{
    public Guid   Id       { get; init; } = Guid.NewGuid();
    public string Name     { get; set; }
    public Kanal  Parent   { get; }
    public Guid   ParentId => Parent.Id;
    public string Path     => $"{Parent.Path}/{Id}";
    public List<Oda> Children { get; } = new();
    public Bina(Kanal parent, string name)
    { Parent = parent ?? throw new ArgumentNullException(nameof(parent)); Name = name; parent.Children.Add(this); }
}

class Oda
{
    public Guid   Id       { get; init; } = Guid.NewGuid();
    public string Name     { get; set; }
    public Bina   Parent   { get; }
    public Guid   ParentId => Parent.Id;
    public string Path     => $"{Parent.Path}/{Id}";
    public List<Bilgisayar> Children { get; } = new();
    public Oda(Bina parent, string name)
    { Parent = parent ?? throw new ArgumentNullException(nameof(parent)); Name = name; parent.Children.Add(this); }
}

class Bilgisayar
{
    public Guid   Id           { get; init; } = Guid.NewGuid();
    public string Name         { get; set; }
    public Oda    Parent       { get; set; }
    public Guid   ParentId     => Parent.Id;
    public string Path         => $"{Parent.Path}/{Id}";
    public List<Eklenti> Children { get; } = new();
    public byte[] Payload      { get; set; } = Array.Empty<byte>();
    public int?   LinkedAssetId { get; set; }
    public Bilgisayar(Oda parent, string name)
    { Parent = parent ?? throw new ArgumentNullException(nameof(parent)); Name = name; parent.Children.Add(this); }
}

class Eklenti
{
    public Guid       Id       { get; init; } = Guid.NewGuid();
    public string     Name     { get; set; }
    public Bilgisayar Parent   { get; set; }
    public Guid       ParentId => Parent.Id;
    public string     Path     => $"{Parent.Path}/{Id}";
    public Eklenti(Bilgisayar parent, string name)
    { Parent = parent ?? throw new ArgumentNullException(nameof(parent)); Name = name; parent.Children.Add(this); }
}

// ─── CRC16-CCITT ─────────────────────────────────────────────────────────────
static class CrcHelper
{
    private const ushort Poly = 0x1021, Init = 0xFFFF;
    public static ushort ComputeCRC16(byte[] data)
    {
        ushort crc = Init;
        foreach (byte b in data)
        {
            crc ^= (ushort)(b << 8);
            for (int i = 0; i < 8; i++)
                crc = (crc & 0x8000) != 0 ? (ushort)((crc << 1) ^ Poly) : (ushort)(crc << 1);
        }
        return crc;
    }
}

// ─── DataPacket ──────────────────────────────────────────────────────────────
static class DataPacket
{
    private static readonly byte[] Header = { 0x20, 0x01, 0x21 };
    public static byte[] BuildPacket(Bilgisayar asset)
    {
        byte[] pathB   = Encoding.UTF8.GetBytes(asset.Path);
        byte[] payload = asset.Payload;
        byte[] body    = new byte[Header.Length + 2 + pathB.Length + 4 + payload.Length];
        int off = 0;
        Array.Copy(Header, 0, body, off, Header.Length); off += Header.Length;
        body[off++] = (byte)(pathB.Length >> 8);
        body[off++] = (byte)(pathB.Length & 0xFF);
        Array.Copy(pathB, 0, body, off, pathB.Length); off += pathB.Length;
        body[off++] = (byte)(payload.Length >> 24);
        body[off++] = (byte)(payload.Length >> 16);
        body[off++] = (byte)(payload.Length >> 8);
        body[off++] = (byte)(payload.Length & 0xFF);
        Array.Copy(payload, 0, body, off, payload.Length);
        ushort crc = CrcHelper.ComputeCRC16(body);
        byte[] pkt  = new byte[body.Length + 2];
        Array.Copy(body, pkt, body.Length);
        pkt[^2] = (byte)(crc >> 8);
        pkt[^1] = (byte)(crc & 0xFF);
        return pkt;
    }
}

// ─── HierarchyManager ────────────────────────────────────────────────────────
static class HierarchyManager
{
    public static void Delete(Holding    e) { foreach (var c in new List<Kanal>(e.Children))      Delete(c); e.Children.Clear(); }
    public static void Delete(Kanal      e) { foreach (var c in new List<Bina>(e.Children))       Delete(c); e.Children.Clear(); e.Parent.Children.Remove(e); }
    public static void Delete(Bina       e) { foreach (var c in new List<Oda>(e.Children))        Delete(c); e.Children.Clear(); e.Parent.Children.Remove(e); }
    public static void Delete(Oda        e) { foreach (var c in new List<Bilgisayar>(e.Children)) Delete(c); e.Children.Clear(); e.Parent.Children.Remove(e); }
    public static void Delete(Bilgisayar e) { foreach (var c in new List<Eklenti>(e.Children))    Delete(c); e.Children.Clear(); e.Parent.Children.Remove(e); }
    public static void Delete(Eklenti    e) { e.Parent.Children.Remove(e); }

    public static void Move(Bilgisayar pc, Oda newParent)
    {
        pc.Parent.Children.Remove(pc);
        pc.Parent = newParent;
        newParent.Children.Add(pc);
    }

    public static void Move(Eklenti e, Bilgisayar newParent)
    {
        e.Parent.Children.Remove(e);
        e.Parent = newParent;
        newParent.Children.Add(e);
    }
}

// ─── Persistence ─────────────────────────────────────────────────────────────
static class Persistence
{
    private static readonly string FilePath = Path.Combine(AppContext.BaseDirectory, "hierarchy-data.json");
    private static readonly JsonSerializerOptions Opts = new() { WriteIndented = false };

    public static (HierarchyStore store, List<AuditEntry> audit) Load()
    {
        var s = new HierarchyStore();
        var audit = new List<AuditEntry>();

        if (!File.Exists(FilePath)) return (s, audit);
        try
        {
            var json = File.ReadAllText(FilePath);
            var data = JsonSerializer.Deserialize<PersistedData>(json, Opts);
            if (data == null) return (s, audit);

            var hMap  = new Dictionary<Guid, Holding>();
            var kMap  = new Dictionary<Guid, Kanal>();
            var bMap  = new Dictionary<Guid, Bina>();
            var oMap  = new Dictionary<Guid, Oda>();
            var pcMap = new Dictionary<Guid, Bilgisayar>();

            foreach (var dto in data.Holdings)
            {
                var h = new Holding(dto.Name) { Id = dto.Id };
                s.Holdings[h.Id] = h;
                hMap[h.Id] = h;
            }
            foreach (var dto in data.Kanals)
                if (dto.ParentId.HasValue && hMap.TryGetValue(dto.ParentId.Value, out var ph))
                {
                    var k = new Kanal(ph, dto.Name) { Id = dto.Id };
                    kMap[k.Id] = k;
                }
            foreach (var dto in data.Binas)
                if (dto.ParentId.HasValue && kMap.TryGetValue(dto.ParentId.Value, out var pk))
                {
                    var b = new Bina(pk, dto.Name) { Id = dto.Id };
                    bMap[b.Id] = b;
                }
            foreach (var dto in data.Odas)
                if (dto.ParentId.HasValue && bMap.TryGetValue(dto.ParentId.Value, out var pb))
                {
                    var o = new Oda(pb, dto.Name) { Id = dto.Id };
                    oMap[o.Id] = o;
                }
            foreach (var dto in data.Bilgisayars)
                if (dto.ParentId.HasValue && oMap.TryGetValue(dto.ParentId.Value, out var po))
                {
                    var pc = new Bilgisayar(po, dto.Name) { Id = dto.Id, LinkedAssetId = dto.LinkedAssetId };
                    if (dto.PayloadB64 != null) pc.Payload = Convert.FromBase64String(dto.PayloadB64);
                    pcMap[pc.Id] = pc;
                }
            foreach (var dto in data.Eklentis)
                if (dto.ParentId.HasValue && pcMap.TryGetValue(dto.ParentId.Value, out var ppc))
                    _ = new Eklenti(ppc, dto.Name) { Id = dto.Id };

            audit.AddRange(data.AuditEntries.Select(a => new AuditEntry(a.Timestamp, a.Action, a.NodeType, a.NodeName)));
        }
        catch { /* corrupt file — start fresh */ }

        return (s, audit);
    }

    public static void Save(HierarchyStore store, List<AuditEntry> audit)
    {
        try
        {
            var allH  = store.Holdings.Values.ToList();
            var allK  = allH.SelectMany(h => h.Children).ToList();
            var allB  = allK.SelectMany(k => k.Children).ToList();
            var allO  = allB.SelectMany(b => b.Children).ToList();
            var allPc = allO.SelectMany(o => o.Children).ToList();
            var allE  = allPc.SelectMany(pc => pc.Children).ToList();

            var data = new PersistedData
            {
                Holdings    = allH.Select(h  => new NodeDto { Id = h.Id,  Name = h.Name }).ToList(),
                Kanals      = allK.Select(k  => new NodeDto { Id = k.Id,  ParentId = k.ParentId,  Name = k.Name }).ToList(),
                Binas       = allB.Select(b  => new NodeDto { Id = b.Id,  ParentId = b.ParentId,  Name = b.Name }).ToList(),
                Odas        = allO.Select(o  => new NodeDto { Id = o.Id,  ParentId = o.ParentId,  Name = o.Name }).ToList(),
                Bilgisayars = allPc.Select(pc => new PcDto  { Id = pc.Id, ParentId = pc.ParentId, Name = pc.Name, PayloadB64 = Convert.ToBase64String(pc.Payload), LinkedAssetId = pc.LinkedAssetId }).ToList(),
                Eklentis    = allE.Select(e  => new NodeDto { Id = e.Id,  ParentId = e.ParentId,  Name = e.Name }).ToList(),
                AuditEntries = audit.Select(a => new AuditEntryDto { Timestamp = a.Timestamp, Action = a.Action, NodeType = a.NodeType, NodeName = a.NodeName }).ToList()
            };
            File.WriteAllText(FilePath, JsonSerializer.Serialize(data, Opts));
        }
        catch { /* ignore save errors */ }
    }
}

class NodeDto     { public Guid Id { get; set; } public Guid? ParentId { get; set; } public string Name { get; set; } = ""; }
class PcDto : NodeDto { public string? PayloadB64 { get; set; } public int? LinkedAssetId { get; set; } }
class AuditEntryDto { public DateTime Timestamp { get; set; } public string Action { get; set; } = ""; public string NodeType { get; set; } = ""; public string NodeName { get; set; } = ""; }
class PersistedData
{
    public List<NodeDto>      Holdings     { get; set; } = new();
    public List<NodeDto>      Kanals       { get; set; } = new();
    public List<NodeDto>      Binas        { get; set; } = new();
    public List<NodeDto>      Odas         { get; set; } = new();
    public List<PcDto>        Bilgisayars  { get; set; } = new();
    public List<NodeDto>      Eklentis     { get; set; } = new();
    public List<AuditEntryDto> AuditEntries { get; set; } = new();
}

// ─── HTML UI ─────────────────────────────────────────────────────────────────
static class HtmlPage
{
    public const string Content = @"<!DOCTYPE html>
<html lang='tr'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>ISOFTASSETHUB — Hiyerarşi</title>
<style>
:root{--bg:#0a0f1e;--card:#111827;--border:#1e2d45;--accent:#f59e0b;--blue:#3b82f6;--text:#e2e8f0;--muted:#64748b;--del:#ef4444;--green:#22c55e}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
header{background:var(--card);border-bottom:1px solid var(--border);padding:14px 28px;display:flex;align-items:center;gap:12px}
header h1{font-size:1.3rem;color:var(--accent)}
header .badge{font-size:.75rem;color:var(--muted);background:#1e2d45;padding:3px 10px;border-radius:99px}
.layout{max-width:1300px;margin:0 auto;padding:20px 16px;display:grid;grid-template-columns:1.4fr 1fr;gap:18px}
@media(max-width:820px){.layout{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px}
.card h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);margin-bottom:14px}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-size:.83rem;font-weight:600;transition:.12s}
.btn-y{background:var(--accent);color:#000}.btn-y:hover{background:#fbbf24}
.btn-b{background:var(--blue);color:#fff}.btn-b:hover{background:#2563eb}
.btn-r{background:var(--del);color:#fff}.btn-r:hover{background:#dc2626}
.btn-v{background:#7c3aed;color:#fff;width:100%;justify-content:center;margin-bottom:14px}.btn-v:hover{background:#6d28d9}
select,input{width:100%;padding:7px 11px;background:#0a0f1e;border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:.88rem;margin-bottom:9px}
label{display:block;font-size:.77rem;color:var(--muted);margin-bottom:3px}
.tree{font-family:'Cascadia Code','Courier New',monospace;font-size:.81rem;line-height:1.75}
.node{display:flex;align-items:center;gap:7px;padding:2px 6px;border-radius:6px;cursor:default;transition:.1s}
.node:hover{background:#1e2d45}
.node .lbl{flex:1}
.node .typ{font-size:.68rem;padding:1px 6px;border-radius:99px;background:#1e2d45;color:var(--muted)}
.node .xbtn{opacity:0;font-size:.72rem;padding:2px 7px;border:none;border-radius:4px;background:var(--del);color:#fff;cursor:pointer}
.node .pbtn{opacity:0;font-size:.72rem;padding:2px 7px;border:none;border-radius:4px;background:var(--blue);color:#fff;cursor:pointer}
.node:hover .xbtn,.node:hover .pbtn{opacity:1}
.i1{padding-left:18px}.i2{padding-left:36px}.i3{padding-left:54px}.i4{padding-left:72px}.i5{padding-left:90px}
.pkt{background:#0a0f1e;border:1px solid var(--border);border-radius:8px;padding:13px;font-family:monospace;font-size:.8rem;line-height:1.9}
.pkt .k{color:var(--accent)}.pkt .v{color:var(--green)}
.pkt .hex{color:#64748b;word-break:break-all;font-size:.72rem;margin-top:6px}
.log{background:#0a0f1e;border:1px solid var(--border);border-radius:8px;padding:11px;font-family:monospace;font-size:.78rem;max-height:140px;overflow-y:auto;color:#64748b}
.log .ok{color:var(--green)}.log .er{color:var(--del)}
.empty{color:var(--muted);text-align:center;padding:28px;font-size:.9rem}
.full{grid-column:1/-1}
hr{border:none;border-top:1px solid var(--border);margin:12px 0}
</style>
</head>
<body>
<header>
  <h1>&#9654; ISOFTASSETHUB</h1>
  <span class='badge'>ASP.NET Core 10</span>
  <span class='badge'>CRC16-CCITT</span>
  <span class='badge' style='margin-left:auto;color:var(--green)'>&#9679; :5050</span>
</header>

<div class='layout'>

  <!-- TREE -->
  <div>
    <div class='card'>
      <h2>Hiyerarsi Agaci</h2>
      <button class='btn btn-v' onclick='loadDemo()'>&#9654; Demo Veriyi Yukle</button>
      <div id='tree'><div class='empty'>Henuz veri yok. Demo yukle veya sagdan ekle.</div></div>
    </div>
  </div>

  <!-- RIGHT PANEL -->
  <div style='display:flex;flex-direction:column;gap:16px'>

    <div class='card'>
      <h2>Yeni Oge Ekle</h2>

      <label>Holding Adi</label>
      <input id='hN' placeholder='orn: TRT Holding'>
      <button class='btn btn-y' style='width:100%;justify-content:center;margin-bottom:14px' onclick='add(""holding"")'>+ Holding</button>

      <hr>
      <label>Ust Holding</label><select id='kP'><option value=''>-- Sec --</option></select>
      <label>Kanal Adi</label><input id='kN' placeholder='orn: TRT 1'>
      <button class='btn btn-y' style='width:100%;justify-content:center;margin-bottom:14px' onclick='add(""kanal"")'>+ Kanal</button>

      <hr>
      <label>Ust Kanal</label><select id='bP'><option value=''>-- Sec --</option></select>
      <label>Bina Adi</label><input id='bN' placeholder='orn: Ankara Merkez'>
      <button class='btn btn-y' style='width:100%;justify-content:center;margin-bottom:14px' onclick='add(""bina"")'>+ Bina</button>

      <hr>
      <label>Ust Bina</label><select id='oP'><option value=''>-- Sec --</option></select>
      <label>Oda Adi</label><input id='oN' placeholder='orn: Sunucu Odasi-A'>
      <button class='btn btn-y' style='width:100%;justify-content:center;margin-bottom:14px' onclick='add(""oda"")'>+ Oda</button>

      <hr>
      <label>Ust Oda</label><select id='pcP'><option value=''>-- Sec --</option></select>
      <label>Bilgisayar Adi</label><input id='pcN' placeholder='orn: SERVER-001'>
      <button class='btn btn-y' style='width:100%;justify-content:center;margin-bottom:14px' onclick='add(""bilgisayar"")'>+ Bilgisayar</button>

      <hr>
      <label>Ust Bilgisayar</label><select id='eP'><option value=''>-- Sec --</option></select>
      <label>Eklenti Adi</label><input id='eN' placeholder='orn: GPU-RTX4090'>
      <button class='btn btn-y' style='width:100%;justify-content:center' onclick='add(""eklenti"")'>+ Eklenti</button>
    </div>

    <div class='card'>
      <h2>Veri Paketi (CRC16-CCITT)</h2>
      <label>Bilgisayar</label>
      <select id='pktPc'><option value=''>-- Sec --</option></select>
      <button class='btn btn-b' style='width:100%;justify-content:center;margin-bottom:10px' onclick='buildPkt()'>&#128190; Paket Olustur</button>
      <div id='pktBox' class='pkt' style='display:none'></div>
    </div>

  </div>

  <!-- LOG -->
  <div class='card full'>
    <h2>Islem Gunlugu</h2>
    <div id='log' class='log'></div>
  </div>

</div>

<script>
async function api(m,p,b){
  try{
    const r=await fetch(p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});
    const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}
    return{ok:r.ok,data:d};
  }catch(e){return{ok:false,data:e.message}}
}

function lg(msg,ok=true){
  const d=document.getElementById('log');
  const line=document.createElement('div');
  line.className=ok?'ok':'er';
  line.textContent=`[${new Date().toLocaleTimeString('tr')}] ${msg}`;
  d.prepend(line);
}

let tree=[];

async function refresh(){
  const{ok,data}=await api('GET','/api/tree');
  if(!ok){lg('Agac yuklenemedi',false);return;}
  tree=Array.isArray(data)?data:[];
  renderTree();populateSelects();
}

const icons={Holding:'&#127970;',Kanal:'&#128225;',Bina:'&#127959;',Oda:'&#128682;',Bilgisayar:'&#128187;',Eklenti:'&#128268;'};

function nd(n,type,indent){
  const t=type.toLowerCase();
  const isPC=type==='Bilgisayar';
  return `<div class='node i${indent}'>
    <span>${icons[type]}</span>
    <span class='lbl'>${n.name}</span>
    <span class='typ'>${type}</span>
    ${isPC?`<button class='pbtn' onclick='quickPkt(""${n.id}"")'>&#128190;</button>`:''}
    <button class='xbtn' onclick='del(""${t}"",""${n.id}"",""${n.name}"")'>&#10005;</button>
  </div>`;
}

function renderTree(){
  const el=document.getElementById('tree');
  if(!tree.length){el.innerHTML=""<div class='empty'>Henuz veri yok.</div>"";return;}
  let h='<div class=""tree"">';
  for(const a of tree){
    h+=nd(a,'Holding',0);
    for(const k of a.children){h+=nd(k,'Kanal',1);
      for(const b of k.children){h+=nd(b,'Bina',2);
        for(const o of b.children){h+=nd(o,'Oda',3);
          for(const pc of o.children){h+=nd(pc,'Bilgisayar',4);
            for(const e of pc.children)h+=nd(e,'Eklenti',5);
          }
        }
      }
    }
  }
  h+='</div>';el.innerHTML=h;
}

function fillSel(id,items){
  const s=document.getElementById(id);const cur=s.value;
  s.innerHTML='<option value="""">-- Sec --</option>';
  items.forEach(i=>s.innerHTML+=`<option value=""${i.id}"">${i.name}</option>`);
  if(cur)s.value=cur;
}

function populateSelects(){
  const holdings=[],kanals=[],binas=[],odas=[],pcs=[];
  for(const h of tree){holdings.push({id:h.id,name:h.name});
    for(const k of h.children){kanals.push({id:k.id,name:k.name});
      for(const b of k.children){binas.push({id:b.id,name:b.name});
        for(const o of b.children){odas.push({id:o.id,name:o.name});
          for(const pc of o.children)pcs.push({id:pc.id,name:pc.name});
        }
      }
    }
  }
  fillSel('kP',holdings);fillSel('bP',kanals);fillSel('oP',binas);
  fillSel('pcP',odas);fillSel('eP',pcs);fillSel('pktPc',pcs);
}

const cfg={
  holding:{inpId:'hN',endpoint:'/api/holding',label:'Holding'},
  kanal:{inpId:'kN',parentId:'kP',endpoint:'/api/kanal',label:'Kanal'},
  bina:{inpId:'bN',parentId:'bP',endpoint:'/api/bina',label:'Bina'},
  oda:{inpId:'oN',parentId:'oP',endpoint:'/api/oda',label:'Oda'},
  bilgisayar:{inpId:'pcN',parentId:'pcP',endpoint:'/api/bilgisayar',label:'Bilgisayar'},
  eklenti:{inpId:'eN',parentId:'eP',endpoint:'/api/eklenti',label:'Eklenti'}
};

async function add(type){
  const c=cfg[type];
  const name=document.getElementById(c.inpId).value.trim();
  if(!name){lg(`${c.label} adi giriniz`,false);return;}
  let body={name};
  if(c.parentId){
    const pid=document.getElementById(c.parentId).value;
    if(!pid){lg(`${c.label} icin parent secin`,false);return;}
    body.parentId=pid;
  }
  const{ok,data}=await api('POST',c.endpoint,body);
  lg(ok?`${c.label} eklendi: ${data.name}`:`Hata: ${JSON.stringify(data)}`,ok);
  if(ok){document.getElementById(c.inpId).value='';await refresh();}
}

async function del(type,id,name){
  if(!confirm(`""${name}"" ve tum alt ogeler silinecek. Onayliyor musunuz?`))return;
  const{ok,data}=await api('DELETE',`/api/${type}/${id}`);
  lg(ok?`Silindi: ${name}`:`Hata: ${JSON.stringify(data)}`,ok);
  if(ok)await refresh();
}

async function buildPkt(){
  const id=document.getElementById('pktPc').value;
  if(!id){lg('Bilgisayar seciniz',false);return;}
  await quickPkt(id);
}

async function quickPkt(id){
  const{ok,data}=await api('GET',`/api/packet/${id}`);
  const box=document.getElementById('pktBox');
  if(!ok){lg(`Paket hatasi: ${JSON.stringify(data)}`,false);box.style.display='none';return;}
  box.style.display='block';
  const hex=data.hexDump.match(/.{1,2}/g).join(' ');
  box.innerHTML=`
    <div><span class='k'>Boyut  :</span> <span class='v'>${data.totalBytes} byte</span></div>
    <div><span class='k'>Header :</span> <span class='v'>${data.header}</span></div>
    <div><span class='k'>CRC16  :</span> <span class='v'>${data.crc16}</span></div>
    <div><span class='k'>Path   :</span> <span class='v' style='font-size:.7rem;word-break:break-all'>${data.path}</span></div>
    <div class='hex'>${hex}</div>`;
  lg(`Paket hazir — CRC: ${data.crc16}  |  ${data.totalBytes} byte`);
}

async function loadDemo(){
  const{ok,data}=await api('POST','/api/demo');
  lg(ok?`Demo yuklendi: ${data}`:`Hata: ${data}`,ok);
  if(ok)await refresh();
}

refresh();
</script>
</body>
</html>";
}
