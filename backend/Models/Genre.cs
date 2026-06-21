using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MangaNPK.Models
{
    public class Genre
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;

        // Relationships
        [JsonIgnore]
        public List<MangaGenre> MangaGenres { get; set; } = [];
    }
}
