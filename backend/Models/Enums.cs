namespace MangaNPK.Models
{
    public enum MangaType
    {
        Manga = 0,   // Nhật Bản
        Manhwa = 1,  // Hàn Quốc
        Manhua = 2   // Trung Quốc
    }

    public enum MangaStatus
    {
        Ongoing = 0,    // Đang tiến hành
        Completed = 1,  // Đã hoàn thành
        Hiatus = 2      // Tạm ngưng
    }

    public enum MangaDemographic
    {
        None = 0,
        Shounen = 1,
        Shoujo = 2,
        Seinen = 3,
        Josei = 4
    }

    public enum MangaFormat
    {
        None = 0,
        Adaptation = 1,
        WebComic = 2,
        OneShot = 3,
        Comic = 4,
        Book = 5
    }
}
