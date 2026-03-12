using System;
using System.Collections.Generic;
using System.Text;

namespace HierarchySystem
{
    // ─────────────────────────────────────────────────────────────────────────────
    // MODELS
    // ─────────────────────────────────────────────────────────────────────────────

    public class Holding
    {
        public Guid   Id       { get; } = Guid.NewGuid();
        public string Name     { get; set; }
        public string Path     => Id.ToString();
        public List<Kanal> Children { get; } = new();

        public Holding(string name) { Name = name; }
        public override string ToString() => Path;
    }

    public class Kanal
    {
        public Guid    Id       { get; } = Guid.NewGuid();
        public string  Name     { get; set; }
        public Holding Parent   { get; }
        public Guid    ParentId => Parent.Id;
        public string  Path     => $"{Parent.Id}/{Id}";
        public List<Bina> Children { get; } = new();

        // ← Parent olmadan new Kanal("x") derlenmez — compile-time güvence
        public Kanal(Holding parent, string name)
        {
            Parent = parent ?? throw new ArgumentNullException(nameof(parent));
            Name   = name;
            parent.Children.Add(this);
        }
        public override string ToString() => Path;
    }

    public class Bina
    {
        public Guid  Id       { get; } = Guid.NewGuid();
        public string Name    { get; set; }
        public Kanal  Parent  { get; }
        public Guid   ParentId => Parent.Id;
        public string Path    => $"{Parent.Path}/{Id}";
        public List<Oda> Children { get; } = new();

        public Bina(Kanal parent, string name)
        {
            Parent = parent ?? throw new ArgumentNullException(nameof(parent));
            Name   = name;
            parent.Children.Add(this);
        }
        public override string ToString() => Path;
    }

    public class Oda
    {
        public Guid  Id       { get; } = Guid.NewGuid();
        public string Name    { get; set; }
        public Bina  Parent   { get; }
        public Guid  ParentId => Parent.Id;
        public string Path   => $"{Parent.Path}/{Id}";
        public List<Bilgisayar> Children { get; } = new();

        public Oda(Bina parent, string name)
        {
            Parent = parent ?? throw new ArgumentNullException(nameof(parent));
            Name   = name;
            parent.Children.Add(this);
        }
        public override string ToString() => Path;
    }

    public class Bilgisayar
    {
        public Guid   Id       { get; } = Guid.NewGuid();
        public string Name     { get; set; }
        public Oda    Parent   { get; }
        public Guid   ParentId => Parent.Id;
        public string Path     => $"{Parent.Path}/{Id}";
        public List<Eklenti> Children { get; } = new();
        public byte[] Payload  { get; set; } = Array.Empty<byte>();

        public Bilgisayar(Oda parent, string name)
        {
            Parent = parent ?? throw new ArgumentNullException(nameof(parent));
            Name   = name;
            parent.Children.Add(this);
        }
        public override string ToString() => Path;
    }

    public class Eklenti
    {
        public Guid        Id       { get; } = Guid.NewGuid();
        public string      Name     { get; set; }
        public Bilgisayar  Parent   { get; }
        public Guid        ParentId => Parent.Id;
        public string      Path     => $"{Parent.Path}/{Id}";

        public Eklenti(Bilgisayar parent, string name)
        {
            Parent = parent ?? throw new ArgumentNullException(nameof(parent));
            Name   = name;
            parent.Children.Add(this);
        }
        public override string ToString() => Path;
    }
    public static class CrcHelper
    {
        private const ushort Polynomial    = 0x1021;
        private const ushort InitialValue  = 0xFFFF;

        public static ushort ComputeCRC16(byte[] data)
        {
            ushort crc = InitialValue;
            foreach (byte b in data)
            {
                crc ^= (ushort)(b << 8);
                for (int i = 0; i < 8; i++)
                    crc = (crc & 0x8000) != 0
                        ? (ushort)((crc << 1) ^ Polynomial)
                        : (ushort)(crc << 1);
            }
            return crc;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DATA PACKET
    //
    // Paket yapısı:
    //   [0x20][0x01][0x21]          — 3-byte sabit header
    //   [pathLen Hi][pathLen Lo]    — 2-byte path uzunluğu (big-endian)
    //   [path bytes…]               — UTF-8 HierarchyPath
    //   [payloadLen x4]             — 4-byte payload uzunluğu (big-endian)
    //   [payload bytes…]            — ham veri
    //   [CRC Hi][CRC Lo]            — CRC16-CCITT (tüm önceki byte'lar üzerinden)
    // ─────────────────────────────────────────────────────────────────────────────

    public static class DataPacket
    {
        private static readonly byte[] Header = { 0x20, 0x01, 0x21 };

        public static byte[] BuildPacket(Bilgisayar asset)
        {
            byte[] pathBytes = Encoding.UTF8.GetBytes(asset.Path);
            byte[] payload   = asset.Payload;

            int bodyLen = Header.Length
                        + 2                  // path length field
                        + pathBytes.Length
                        + 4                  // payload length field
                        + payload.Length;

            byte[] body   = new byte[bodyLen];
            int    offset = 0;

            // Header
            Array.Copy(Header, 0, body, offset, Header.Length);
            offset += Header.Length;

            // Path length (big-endian 16-bit)
            body[offset++] = (byte)(pathBytes.Length >> 8);
            body[offset++] = (byte)(pathBytes.Length & 0xFF);

            // Path
            Array.Copy(pathBytes, 0, body, offset, pathBytes.Length);
            offset += pathBytes.Length;

            // Payload length (big-endian 32-bit)
            body[offset++] = (byte)(payload.Length >> 24);
            body[offset++] = (byte)(payload.Length >> 16);
            body[offset++] = (byte)(payload.Length >> 8);
            body[offset++] = (byte)(payload.Length & 0xFF);

            // Payload
            Array.Copy(payload, 0, body, offset, payload.Length);

            // CRC üzerinden tüm body
            ushort crc    = CrcHelper.ComputeCRC16(body);
            byte[] packet = new byte[body.Length + 2];
            Array.Copy(body, packet, body.Length);
            packet[^2] = (byte)(crc >> 8);
            packet[^1] = (byte)(crc & 0xFF);

            return packet;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HIERARCHY MANAGER  —  Cascade Delete
    // ─────────────────────────────────────────────────────────────────────────────

    public static class HierarchyManager
    {
        public static void Delete(Holding entity)
        {
            Console.WriteLine($"[DELETE] Holding  : {entity.Name} [{entity.Id}]");
            foreach (var child in new List<Kanal>(entity.Children))
                Delete(child);
            entity.Children.Clear();
        }

        public static void Delete(Kanal entity)
        {
            Console.WriteLine($"[DELETE]   Kanal  : {entity.Name} [{entity.Id}]");
            foreach (var child in new List<Bina>(entity.Children))
                Delete(child);
            entity.Children.Clear();
            entity.Parent.Children.Remove(entity);
        }

        public static void Delete(Bina entity)
        {
            Console.WriteLine($"[DELETE]     Bina : {entity.Name} [{entity.Id}]");
            foreach (var child in new List<Oda>(entity.Children))
                Delete(child);
            entity.Children.Clear();
            entity.Parent.Children.Remove(entity);
        }

        public static void Delete(Oda entity)
        {
            Console.WriteLine($"[DELETE]       Oda: {entity.Name} [{entity.Id}]");
            foreach (var child in new List<Bilgisayar>(entity.Children))
                Delete(child);
            entity.Children.Clear();
            entity.Parent.Children.Remove(entity);
        }

        public static void Delete(Bilgisayar entity)
        {
            Console.WriteLine($"[DELETE]         Bilgisayar: {entity.Name} [{entity.Id}]");
            foreach (var child in new List<Eklenti>(entity.Children))
                Delete(child);
            entity.Children.Clear();
            entity.Parent.Children.Remove(entity);
        }

        public static void Delete(Eklenti entity)
        {
            Console.WriteLine($"[DELETE]           Eklenti: {entity.Name} [{entity.Id}]");
            entity.Parent.Children.Remove(entity);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PROGRAM — Demo
    // ─────────────────────────────────────────────────────────────────────────────

    class Program
    {
        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("╔══════════════════════════════════════════════╗");
            Console.WriteLine("║         HierarchySystem  Demo                ║");
            Console.WriteLine("╚══════════════════════════════════════════════╝\n");

            // ── 1. Hiyerarşi inşa et ──────────────────────────────────────────
            var holding    = new Holding("TRT Holding");
            var kanal      = new Kanal(holding, "TRT 1");
            var bina       = new Bina(kanal, "Ankara Merkez Bina");
            var oda        = new Oda(bina, "Sunucu Odası-A");
            var bilgisayar = new Bilgisayar(oda, "SERVER-001");
            var eklenti1   = new Eklenti(bilgisayar, "GPU-RTX4090");
            var eklenti2   = new Eklenti(bilgisayar, "NIC-10GbE");

            Console.WriteLine("Oluşturulan hiyerarşi:");
            Console.WriteLine($"  Holding    : {holding.Name}");
            Console.WriteLine($"  Kanal      : {kanal.Name}");
            Console.WriteLine($"  Bina       : {bina.Name}");
            Console.WriteLine($"  Oda        : {oda.Name}");
            Console.WriteLine($"  Bilgisayar : {bilgisayar.Name}");
            Console.WriteLine($"  Eklentiler : {eklenti1.Name}, {eklenti2.Name}");

            Console.WriteLine($"\nBilgisayar.Path (HoldingID/.../BilgisayarID):");
            Console.WriteLine($"  {bilgisayar.Path}");

            // ── 2. Paket oluştur ──────────────────────────────────────────────
            bilgisayar.Payload = Encoding.UTF8.GetBytes("{\"status\":\"online\",\"cpu\":42,\"ram\":87}");
            byte[] packet = DataPacket.BuildPacket(bilgisayar);
            ushort crc    = (ushort)((packet[^2] << 8) | packet[^1]);

            Console.WriteLine($"\nPaket Detayları:");
            Console.WriteLine($"  Toplam boyut : {packet.Length} byte");
            Console.WriteLine($"  Header       : 0x{packet[0]:X2} 0x{packet[1]:X2} 0x{packet[2]:X2}");
            Console.WriteLine($"  CRC16-CCITT  : 0x{crc:X4}");

            // Byte dump (ilk 32 byte)
            int dump = Math.Min(32, packet.Length);
            Console.Write($"  İlk {dump} byte: ");
            for (int i = 0; i < dump; i++) Console.Write($"{packet[i]:X2} ");
            Console.WriteLine("...\n");

            // ── 3. Cascade Delete — Bina sil ──────────────────────────────────
            Console.WriteLine($"── Bina siliniyor: \"{bina.Name}\" ──");
            HierarchyManager.Delete(bina);

            Console.WriteLine($"\nSilme sonrası:");
            Console.WriteLine($"  Kanal '{kanal.Name}' → Child sayısı : {kanal.Children.Count}  (beklenen: 0)");
            Console.WriteLine($"  Oda   '{oda.Name}'  → Child sayısı : {oda.Children.Count}    (beklenen: 0)");

            // ── 4. Unit-test benzeri compile-time güvence gösterimi ────────────
            Console.WriteLine("\nCompile-time güvence:");
            Console.WriteLine("  // new Kanal(\"yalnız\")      → CS7036: required arg 'parent' eksik");
            Console.WriteLine("  // new Bilgisayar(oda2)      → 'oda2' tanımsız");
            Console.WriteLine("  Yalnızca parent referansıyla nesne oluşturulabilir. ✓");

            Console.WriteLine("\n╔══════════════════════════════════════════════╗");
            Console.WriteLine("║         Demo başarıyla tamamlandı            ║");
            Console.WriteLine("╚══════════════════════════════════════════════╝");
        }
    }
}
