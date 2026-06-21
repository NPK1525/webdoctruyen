using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MangaNPK.Models
{
    public class Author
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Biography { get; set; } = string.Empty;

        // Relationships
        [JsonIgnore]
        public List<MangaAuthor> MangaAuthors { get; set; } = [];
    }
}
