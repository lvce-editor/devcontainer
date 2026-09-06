// The outer container runs Docker inside the disposable VM. These privileges
// apply only to that guest; there is no connection to the browser host's Docker.
package main

import (
 "encoding/json"
 "os"
 "strings"
)

func main() {
 data, err := os.ReadFile(os.Args[1]); if err != nil { panic(err) }
 var spec map[string]interface{}
 if err = json.Unmarshal(data, &spec); err != nil { panic(err) }
 process := spec["process"].(map[string]interface{})
 caps := strings.Fields("CAP_CHOWN CAP_DAC_OVERRIDE CAP_DAC_READ_SEARCH CAP_FOWNER CAP_FSETID CAP_KILL CAP_SETGID CAP_SETUID CAP_SETPCAP CAP_LINUX_IMMUTABLE CAP_NET_BIND_SERVICE CAP_NET_BROADCAST CAP_NET_ADMIN CAP_NET_RAW CAP_IPC_LOCK CAP_IPC_OWNER CAP_SYS_MODULE CAP_SYS_RAWIO CAP_SYS_CHROOT CAP_SYS_PTRACE CAP_SYS_PACCT CAP_SYS_ADMIN CAP_SYS_BOOT CAP_SYS_NICE CAP_SYS_RESOURCE CAP_SYS_TIME CAP_SYS_TTY_CONFIG CAP_MKNOD CAP_LEASE CAP_AUDIT_WRITE CAP_AUDIT_CONTROL CAP_SETFCAP CAP_MAC_OVERRIDE CAP_MAC_ADMIN CAP_SYSLOG CAP_WAKE_ALARM CAP_BLOCK_SUSPEND CAP_AUDIT_READ CAP_PERFMON CAP_BPF CAP_CHECKPOINT_RESTORE")
 process["capabilities"] = map[string]interface{}{"bounding":caps,"effective":caps,"inheritable":caps,"permitted":caps,"ambient":caps}
 linux := spec["linux"].(map[string]interface{})
 delete(linux, "maskedPaths")
 delete(linux, "readonlyPaths")
 linux["resources"] = map[string]interface{}{"devices": []interface{}{map[string]interface{}{"allow":true,"access":"rwm"}}}
 for _, value := range spec["mounts"].([]interface{}) {
   mount := value.(map[string]interface{})
   if mount["destination"] == "/sys" || mount["destination"] == "/sys/fs/cgroup" {
     mount["options"] = []string{"rw","nosuid","noexec","nodev"}
   }
 }
 data, err = json.MarshalIndent(spec, "", "  "); if err != nil { panic(err) }
 if err = os.WriteFile(os.Args[1], data, 0644); err != nil { panic(err) }
}
