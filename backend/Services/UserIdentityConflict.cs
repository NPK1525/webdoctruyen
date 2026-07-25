using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed record UserIdentityConflict(string Field, string Message)
{
    public static UserIdentityConflict? FromSqlServer(int number, string message)
    {
        if (number is not (2601 or 2627)) return null;

        if (message.Contains("IX_Users_NormalizedUsername", StringComparison.OrdinalIgnoreCase))
            return new("username", "Tên đăng nhập đã tồn tại.");

        if (message.Contains("IX_Users_NormalizedEmail", StringComparison.OrdinalIgnoreCase))
            return new("email", "Email đã được sử dụng.");

        return null;
    }

    public static UserIdentityConflict? FromDbUpdateException(DbUpdateException exception)
    {
        for (var current = exception.InnerException; current is not null; current = current.InnerException)
        {
            if (current is SqlException sqlException)
                return FromSqlServer(sqlException.Number, sqlException.Message);
        }

        return null;
    }
}
