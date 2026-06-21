using System.Text.Json.Serialization;

namespace MangaNPK.Models
{
    public class Page
    {
        public int Id { get; set; }
        public int ChapterId { get; set; }

        [JsonIgnore]
        public Chapter Chapter { get; set; } = null!;

        public int PageNumber { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
    }
}
