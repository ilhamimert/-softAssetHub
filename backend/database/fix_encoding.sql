-- ============================================================
-- FIX ENCODING - Turkce karakter duzeltme
-- Tum metin alanlari N'' (Unicode) prefix ile guncelleniyor
-- ============================================================
USE AssetManagementDB;
GO

-- ============================================================
-- CHANNELS - Aciklamalar
-- ============================================================
UPDATE Channels SET Description = N'Türkiye Radyo ve Televizyon Kurumu - Türkiye''nin ulusal yayın kuruluşu' WHERE ChannelName = 'TRT';
UPDATE Channels SET Description = N'Turkuaz Medya Grubu - Dijital ve uydu yayıncılığı' WHERE ChannelName = 'Turkuaz Medya';
UPDATE Channels SET Description = N'Ekol Televizyon - Haber ve magazin kanalı' WHERE ChannelName = 'Ekol TV';
UPDATE Channels SET Description = N'Demirören Medya Grubu - Haber ve eğlence' WHERE ChannelName = 'Demirören Medya';
UPDATE Channels SET Description = N'CNBC-e Türkiye - İş dünyası ve finans haberleri' WHERE ChannelName = 'CNBC-e';
UPDATE Channels SET Description = N'Now Dijital Medya - Dijital yayın platformu' WHERE ChannelName = 'Now TV';
UPDATE Channels SET Description = N'Digiturk - Türkiye''nin lider dijital uydu yayın platformu' WHERE ChannelName = 'Digiturk';
UPDATE Channels SET Description = N'TGRT Haber - 24 saat haber kanalı' WHERE ChannelName = 'TGRT Haber';
GO

-- ============================================================
-- BUILDINGS - Bina adlari, adresler, yoneticiler
-- ============================================================
UPDATE Buildings SET BuildingName = N'TRT İstanbul Merkez',         Address = N'Esentepe Mah. TRT Sitesi, Şişli',              City = N'İstanbul', Manager = N'Mahmut Aydın'    WHERE BuildingID = 1;
UPDATE Buildings SET BuildingName = N'TRT Ankara Genel Müdürlük',   Address = N'Turan Güneş Bulvarı No:161, Oran',             City = N'Ankara',   Manager = N'Serdar Yılmaz'  WHERE BuildingID = 2;
UPDATE Buildings SET BuildingName = N'Turkuaz Medya İstanbul',      Address = N'Bağcılar, Güneşli, Basın Ekspres Yolu',        City = N'İstanbul', Manager = N'Ali Karahan'    WHERE BuildingID = 3;
UPDATE Buildings SET BuildingName = N'Turkuaz Medya Ankara',        Address = N'Mustafa Kemal Mah. No:55, Çankaya',            City = N'Ankara',   Manager = N'Veli Şahin'     WHERE BuildingID = 4;
UPDATE Buildings SET BuildingName = N'Ekol TV İstanbul',            Address = N'Esenler, Medya Caddesi No:10',                 City = N'İstanbul', Manager = N'Hüseyin Kaya'   WHERE BuildingID = 5;
UPDATE Buildings SET BuildingName = N'Ekol TV Ankara',              Address = N'Çankaya, Balıklı Mah. No:12',                  City = N'Ankara',   Manager = N'Mustafa Demir'  WHERE BuildingID = 6;
UPDATE Buildings SET BuildingName = N'Demirören İstanbul',          Address = N'Bağcılar, Güneşli Medya Caddesi No:5',         City = N'İstanbul', Manager = N'Okan Turan'     WHERE BuildingID = 7;
UPDATE Buildings SET BuildingName = N'Demirören Ankara',            Address = N'Söğütözü, Medya Blokları',                     City = N'Ankara',   Manager = N'Ercan Bulut'    WHERE BuildingID = 8;
UPDATE Buildings SET BuildingName = N'CNBC-e İstanbul',             Address = N'Maslak, İş Kuleleri B Blok',                   City = N'İstanbul', Manager = N'Zeynep Arslan'  WHERE BuildingID = 9;
UPDATE Buildings SET BuildingName = N'CNBC-e Ankara',               Address = N'Kızılay, Mithatpaşa Cad. No:20',               City = N'Ankara',   Manager = N'Neslihan Çelik' WHERE BuildingID = 10;
UPDATE Buildings SET BuildingName = N'Now TV İstanbul',             Address = N'Ataşehir, Finans Merkezi, Kule 2',             City = N'İstanbul', Manager = N'Barış Öztürk'   WHERE BuildingID = 11;
UPDATE Buildings SET BuildingName = N'Now TV Ankara',               Address = N'Çukurambar, Oran Sitesi',                      City = N'Ankara',   Manager = N'Deniz Yıldız'   WHERE BuildingID = 12;
UPDATE Buildings SET BuildingName = N'Digiturk İstanbul HQ',        Address = N'Levent, Kanyon Ofis, K:10',                    City = N'İstanbul', Manager = N'Murat Erdoğan'  WHERE BuildingID = 13;
UPDATE Buildings SET BuildingName = N'Digiturk Ankara',             Address = N'Konya Yolu, Teknokent İç Yolu',                City = N'Ankara',   Manager = N'Gökhan Avcı'    WHERE BuildingID = 14;
UPDATE Buildings SET BuildingName = N'TGRT İstanbul',               Address = N'Bağcılar, Medya Köyü, Blok A',                 City = N'İstanbul', Manager = N'Seda Koç'       WHERE BuildingID = 15;
UPDATE Buildings SET BuildingName = N'TGRT Ankara',                  Address = N'Şentepe, İvedik OSB Yolu',                    City = N'Ankara',   Manager = N'Cengiz Ay'      WHERE BuildingID = 16;
GO

-- ============================================================
-- SERVER ROOMS - Oda adlari
-- ============================================================
UPDATE ServerRooms SET RoomName = N'Server Odası - Kat 1',        Capacity = N'40 Rack Kabini' WHERE ServerRoomID = 1;
UPDATE ServerRooms SET RoomName = N'Server Odası - Kat 3',        Capacity = N'20 Rack Kabini' WHERE ServerRoomID = 2;
UPDATE ServerRooms SET RoomName = N'Ana Data Center',              Capacity = N'60 Rack Kabini' WHERE ServerRoomID = 3;
UPDATE ServerRooms SET RoomName = N'Yedek Server Odası',          Capacity = N'15 Rack Kabini' WHERE ServerRoomID = 4;
UPDATE ServerRooms SET RoomName = N'Server Odası Zemin',          Capacity = N'25 Rack Kabini' WHERE ServerRoomID = 5;
UPDATE ServerRooms SET RoomName = N'Server Odası Kat 2',          Capacity = N'15 Rack Kabini' WHERE ServerRoomID = 6;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'10 Rack Kabini' WHERE ServerRoomID = 7;
UPDATE ServerRooms SET RoomName = N'Ana Server Odası',            Capacity = N'20 Rack Kabini' WHERE ServerRoomID = 8;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'8 Rack Kabini'  WHERE ServerRoomID = 9;
UPDATE ServerRooms SET RoomName = N'Server Odası - Kat 1',        Capacity = N'35 Rack Kabini' WHERE ServerRoomID = 10;
UPDATE ServerRooms SET RoomName = N'Server Odası - Kat 4',        Capacity = N'15 Rack Kabini' WHERE ServerRoomID = 11;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'12 Rack Kabini' WHERE ServerRoomID = 12;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'18 Rack Kabini' WHERE ServerRoomID = 13;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'8 Rack Kabini'  WHERE ServerRoomID = 14;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'20 Rack Kabini' WHERE ServerRoomID = 15;
UPDATE ServerRooms SET RoomName = N'Ana Data Center - Kat 2',     Capacity = N'100 Rack Kabini' WHERE ServerRoomID = 16;
UPDATE ServerRooms SET RoomName = N'DR Center - Kat 5',           Capacity = N'40 Rack Kabini' WHERE ServerRoomID = 17;
UPDATE ServerRooms SET RoomName = N'Server Odası',                 Capacity = N'20 Rack Kabini' WHERE ServerRoomID = 18;
GO

-- ============================================================
-- MAINTENANCE RECORDS - Aciklamalar, teknisyen adlari, notlar
-- ============================================================
UPDATE MaintenanceRecords SET Description = N'CUDA driver ve firmware güncellemesi yapıldı', TechnicianName = N'Ahmet Yılmaz',  Notes = N'Başarılı'                                            WHERE MaintenanceID = 1;
UPDATE MaintenanceRecords SET Description = N'Fan ve soğutma sistemi temizliği',             TechnicianName = N'Mehmet Öztürk', Notes = N'OK'                                                 WHERE MaintenanceID = 2;
UPDATE MaintenanceRecords SET Description = N'Genel sistem kontrolü',                        TechnicianName = N'Fatih Kaya',    Notes = N'OK'                                                 WHERE MaintenanceID = 3;
UPDATE MaintenanceRecords SET Description = N'BIOS ve display driver güncellemesi',          TechnicianName = N'Ahmet Yılmaz',  Notes = N'Başarılı'                                            WHERE MaintenanceID = 4;
UPDATE MaintenanceRecords SET Description = N'Güç ünitesi değişimi',                         TechnicianName = N'Sercan Demir',  Notes = N'Güç ünitesi arızalıydı, yenisiyle değiştirildi'     WHERE MaintenanceID = 5;
UPDATE MaintenanceRecords SET Description = N'OS ve firmware güncelleme',                    TechnicianName = N'Ahmet Yılmaz',  Notes = N'Başarılı'                                            WHERE MaintenanceID = 6;
UPDATE MaintenanceRecords SET Description = N'RAM modülü değişimi',                          TechnicianName = N'Sercan Demir',  Notes = N'Arızalı RAM modülü tespit edildi ve değiştirildi'   WHERE MaintenanceID = 7;
GO

-- ============================================================
-- ALERTS - Uyari mesajlari
-- ============================================================
UPDATE Alerts SET AlertMessage = N'RTX 4090 #001 GPU kullanımı %90 üzerinde. Anlık kullanım: %92'  WHERE AlertID = 1;
UPDATE Alerts SET AlertMessage = N'RTX 4090 #001 sıcaklığı yüksek: 78°C (Eşik: 80°C)'            WHERE AlertID = 2;
UPDATE Alerts SET AlertMessage = N'Display RTX 4090 #002 bağlantısı kesildi - OFFLINE'             WHERE AlertID = 3;
UPDATE Alerts SET AlertMessage = N'GPU Tesla V100 #001 için planlı bakım yaklaşıyor: 2024-04-10'   WHERE AlertID = 4;
UPDATE Alerts SET AlertMessage = N'Dell PowerEdge R750 #001 disk kullanımı %54 (yakında dolabilir)' WHERE AlertID = 5;
GO

-- ============================================================
-- USERS - Ad soyad, departman
-- ============================================================
UPDATE Users SET FullName = N'Sistem Yöneticisi', Department = N'IT'            WHERE Username = 'admin';
UPDATE Users SET FullName = N'Mahmut Aydın',       Department = N'IT Yönetimi'  WHERE Username = 'trt_manager';
UPDATE Users SET FullName = N'Ahmet Yılmaz',       Department = N'Teknik Destek' WHERE Username = 'trt_tech';
UPDATE Users SET FullName = N'Murat Erdoğan',      Department = N'IT Yönetimi'  WHERE Username = 'dgt_manager';
UPDATE Users SET FullName = N'Gözlemci Kullanıcı', Department = N'Yönetim'      WHERE Username = 'viewer1';
GO

PRINT 'Encoding fix tamamlandi - tum Turkce karakterler duzeltildi.';
GO
