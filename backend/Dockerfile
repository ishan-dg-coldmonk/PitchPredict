# ---- Build stage: compile the fat jar with Maven + JDK 17 ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Copy pom first so dependency download is cached when only source changes
COPY pom.xml .
RUN mvn -q -e -DskipTests dependency:go-offline || true
COPY src ./src
RUN mvn -q -DskipTests clean package

# ---- Run stage: slim JRE, small footprint for the 512 MB free tier ----
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/pitchpredict-1.0.0.jar app.jar

# Render injects the PORT env var; application-prod.yml already binds ${PORT:8080}.
# SerialGC + a capped heap keep total memory comfortably under 512 MB.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
