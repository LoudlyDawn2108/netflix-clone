using Moq;
using Moq.Language.Flow;
using Streamflix.Transcoding.Core.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Streamflix.Transcoding.Tests.Extensions
{
    public static class MockExtensions
    {        public static void SetupTranscodeVideoAsync(
            this Mock<ITranscoder> mock,
            Dictionary<ITranscodingProfile, string> returnValue)
        {
            // This helper method avoids the issue with optional parameters in lambda expressions
            mock.Setup(x => x.TranscodeVideoAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IEnumerable<ITranscodingProfile>>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(returnValue);
        }
    }
}
