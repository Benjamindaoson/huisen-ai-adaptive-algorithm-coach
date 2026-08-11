UPDATE languages
SET compile_cmd = '/usr/local/openjdk13/bin/javac -J-Xms32m -J-Xmx256m -J-XX:MaxMetaspaceSize=128m -J-XX:ReservedCodeCacheSize=64m %s Main.java',
    run_cmd = '/usr/local/openjdk13/bin/java -Xms32m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=64m Main'
WHERE id = 62;
