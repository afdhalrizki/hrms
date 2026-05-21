allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

subprojects {
    if (project.name != "app") {
        val configureProject = {
            if (extensions.findByName("android") != null) {
                configure<com.android.build.gradle.BaseExtension> {
                    compileSdkVersion(36)
                    ndkVersion = "27.0.12077973"
                    if (namespace == null) {
                        val groupStr = project.group.toString()
                        namespace = if (groupStr.isNotEmpty()) groupStr else "com.hrms.mobile.dependency.${project.name.replace("-", ".")}"
                    }
                }
            }
        }

        if (state.executed) {
            configureProject()
        } else {
            afterEvaluate {
                configureProject()
            }
        }
    }
}
