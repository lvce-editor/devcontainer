#include <fcntl.h>
#include <linux/random.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/random.h>
#include <unistd.h>

int main(void) {
  const char *seed = getenv("LVCE_RANDOM_SEED");
  if (seed) {
    struct {
      int entropy_count;
      int buf_size;
      unsigned char bytes[32];
    } entropy = {.entropy_count = 256, .buf_size = 32};
    if (strlen(seed) != 64 || strspn(seed, "0123456789abcdef") != 64) {
      fputs("Invalid browser random seed\n", stderr);
      return 1;
    }
    for (size_t i = 0; i < sizeof(entropy.bytes); i++) {
      char hex[] = {seed[i * 2], seed[i * 2 + 1], 0};
      entropy.bytes[i] = (unsigned char)strtoul(hex, NULL, 16);
    }
    int fd = open("/dev/random", O_WRONLY | O_CLOEXEC);
    if (fd < 0 || ioctl(fd, RNDADDENTROPY, &entropy) < 0) {
      perror("Seeding Linux random generator");
      return 1;
    }
    close(fd);
  }
  // Native preflight uses its host's already initialized generator. In the VM
  // this also proves the browser seed reached Linux before starting Docker.
  unsigned char byte;
  if (getrandom(&byte, 1, GRND_NONBLOCK) != 1) {
    perror("Linux random generator is not ready");
    return 1;
  }
  puts("FULL_STACK_PHASE Linux random generator ready");
  return 0;
}
