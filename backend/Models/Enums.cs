namespace MangaNPK.Models
{
    public enum MangaType
    {
        Manga = 0,   // Nhat Ban
        Manhwa = 1,  // Han Quoc
        Manhua = 2,  // Trung Quoc
        Webtoon = 3,
        Comic = 4
    }

    public enum MangaStatus
    {
        Ongoing = 0,    // Dang tien hanh
        Completed = 1,  // Da hoan thanh
        Hiatus = 2,     // Tam ngung
        Cancelled = 3
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

    public enum TitleDraftReviewStatus
    {
        Draft = 0,
        Pending = 1,
        Approved = 2,
        Rejected = 3
    }

    public enum MangaAgeRating
    {
        AllAges = 0,
        Teen13 = 1,
        Teen16 = 2,
        Adult18 = 3
    }
}
