package com.pawfinder.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {
    private static final String ACCOUNT = "{\"name\":\"Ana Reyes\",\"email\":\"ana@example.com\",\"password\":\"correct horse\"}";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired RevokedTokenRepository revokedTokens;
    @Autowired PasswordResetTokenRepository resets;
    @MockitoBean MailService mailService;

    @BeforeEach
    void cleanDatabase() {
        resets.deleteAll();
        revokedTokens.deleteAll();
        users.deleteAll();
        reset(mailService);
    }

    @Test
    void registerLoginRestoreAndLogout() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(ACCOUNT))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("ana@example.com"))
                .andExpect(jsonPath("$.user.password").doesNotExist());

        String loginBody = login("correct horse")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(loginBody).get("token").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.name").value("Ana Reyes"));
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrationValidatesFieldsAndDuplicateEmail() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
        register();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(ACCOUNT))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.fields.email").exists());
    }

    @Test
    void forgotPasswordDoesNotRevealUnknownAccounts() throws Exception {
        register();
        String known = mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.com\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(unknown).isEqualTo(known);
        verify(mailService, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test
    void resetPasswordIsOneTimeAndInvalidatesExistingSessions() throws Exception {
        register();
        String loginBody = login("correct horse").andReturn().getResponse().getContentAsString();
        String oldToken = json.readTree(loginBody).get("token").asText();

        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.com\"}"))
                .andExpect(status().isOk());
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mailService).send(eq("ana@example.com"), anyString(), text.capture());
        Matcher matcher = Pattern.compile("[?&]reset=([0-9a-f]{64})").matcher(text.getValue());
        assertThat(matcher.find()).isTrue();
        String resetToken = matcher.group(1);

        String resetBody = "{\"token\":\"" + resetToken + "\",\"password\":\"brand new password\"}";
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(resetBody))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(resetBody))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldToken))
                .andExpect(status().isUnauthorized());
        login("correct horse").andExpect(status().isUnauthorized());
        login("brand new password").andExpect(status().isOk());
    }

    @Test
    void malformedJsonReturnsJsonError() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
    }

    private void register() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(ACCOUNT))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions login(String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ana@example.com\",\"password\":\"" + password + "\"}"));
    }
}
