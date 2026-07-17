namespace MangaNPK.Services;

public static class ChapterUploadCleanup
{
    public static async Task TryCleanupAsync(
        Func<Task> rollback,
        Action deleteFiles,
        Action<Exception> logFailure)
    {
        try
        {
            await rollback();
        }
        catch (Exception exception)
        {
            logFailure(exception);
        }

        try
        {
            deleteFiles();
        }
        catch (Exception exception)
        {
            logFailure(exception);
        }
    }
}
