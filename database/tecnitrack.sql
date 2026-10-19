-- TecniTrack: script completo de creación de la base, tablas y datos de ejemplo.
-- Generado con: npm run db:sql (database/generar-sql.js). No editar a mano.
-- Importar con: mysql -u root -p < database/tecnitrack.sql
-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: tecnitrack
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `tecnitrack`
--

/*!40000 DROP DATABASE IF EXISTS `tecnitrack`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tecnitrack` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `tecnitrack`;

--
-- Table structure for table `catalogo_items`
--

DROP TABLE IF EXISTS `catalogo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `catalogo_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `tipo` enum('Servicio','Repuesto') NOT NULL,
  `precio_referencia` decimal(10,2) NOT NULL DEFAULT 0.00,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_catalogo_items_nombre` (`nombre`),
  CONSTRAINT `chk_catalogo_items_precio` CHECK (`precio_referencia` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_items`
--

LOCK TABLES `catalogo_items` WRITE;
/*!40000 ALTER TABLE `catalogo_items` DISABLE KEYS */;
INSERT INTO `catalogo_items` (`id`, `nombre`, `tipo`, `precio_referencia`, `activo`, `created_at`, `updated_at`) VALUES (1,'Diagnóstico general','Servicio',10.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(2,'Limpieza interna y cambio de pasta térmica','Servicio',15.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(3,'Instalación de sistema operativo','Servicio',20.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(4,'Memoria RAM 8GB DDR4','Repuesto',35.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(5,'Disco SSD 480GB','Repuesto',55.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(6,'Cartucho de tinta genérico','Repuesto',12.00,1,'2026-08-25 08:00:00','2026-08-25 08:00:00');
/*!40000 ALTER TABLE `catalogo_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clientes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `correo` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_clientes_telefono` (`telefono`),
  KEY `idx_clientes_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` (`id`, `nombre`, `telefono`, `correo`, `created_at`, `updated_at`) VALUES (1,'María Elena Hernández','7123-4567','maria.hernandez@example.com','2026-08-28 09:00:00','2026-08-28 09:00:00'),(2,'Carlos Alberto Ramírez','7234-8912','carlos.ramirez@example.com','2026-08-28 09:00:00','2026-08-28 09:00:00'),(3,'Ana Lucía Martínez','7345-6720','ana.martinez@example.com','2026-08-28 09:00:00','2026-08-28 09:00:00');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizacion_items`
--

DROP TABLE IF EXISTS `cotizacion_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cotizacion_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int(10) unsigned NOT NULL,
  `catalogo_id` int(10) unsigned NOT NULL,
  `cantidad` int(10) unsigned NOT NULL DEFAULT 1,
  `precio_unitario` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `cotizacion_id` (`cotizacion_id`),
  KEY `catalogo_id` (`catalogo_id`),
  CONSTRAINT `cotizacion_items_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cotizacion_items_ibfk_2` FOREIGN KEY (`catalogo_id`) REFERENCES `catalogo_items` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_cotizacion_items_cantidad` CHECK (`cantidad` >= 1),
  CONSTRAINT `chk_cotizacion_items_precio` CHECK (`precio_unitario` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizacion_items`
--

LOCK TABLES `cotizacion_items` WRITE;
/*!40000 ALTER TABLE `cotizacion_items` DISABLE KEYS */;
INSERT INTO `cotizacion_items` (`id`, `cotizacion_id`, `catalogo_id`, `cantidad`, `precio_unitario`, `created_at`, `updated_at`) VALUES (1,1,1,1,10.00,'2026-09-02 09:00:00','2026-09-02 09:00:00'),(2,1,2,1,15.00,'2026-09-02 09:00:00','2026-09-02 09:00:00'),(3,2,1,1,10.00,'2026-09-07 09:15:00','2026-09-07 09:15:00'),(4,2,2,1,15.00,'2026-09-07 09:15:00','2026-09-07 09:15:00'),(5,2,6,2,10.00,'2026-09-07 09:15:00','2026-09-07 09:15:00'),(6,3,1,1,10.00,'2026-09-06 09:00:00','2026-09-06 09:00:00'),(7,3,5,1,55.00,'2026-09-06 09:00:00','2026-09-06 09:00:00'),(8,3,3,1,20.00,'2026-09-06 09:00:00','2026-09-06 09:00:00'),(9,4,1,1,10.00,'2026-09-09 08:30:00','2026-09-09 08:30:00'),(10,4,4,1,35.00,'2026-09-09 08:30:00','2026-09-09 08:30:00'),(11,5,1,1,10.00,'2026-09-12 08:45:00','2026-09-12 08:45:00'),(12,5,2,1,15.00,'2026-09-12 08:45:00','2026-09-12 08:45:00'),(13,5,4,1,35.00,'2026-09-12 08:45:00','2026-09-12 08:45:00');
/*!40000 ALTER TABLE `cotizacion_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cotizaciones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `pendiente_ticket_id` int(10) unsigned GENERATED ALWAYS AS (case when `estado` = 'Pendiente' then `ticket_id` else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cotizaciones_una_pendiente` (`pendiente_ticket_id`),
  KEY `idx_cotizaciones_ticket_estado` (`ticket_id`,`estado`),
  CONSTRAINT `cotizaciones_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_cotizaciones_total` CHECK (`total` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizaciones`
--

LOCK TABLES `cotizaciones` WRITE;
/*!40000 ALTER TABLE `cotizaciones` DISABLE KEYS */;
INSERT INTO `cotizaciones` (`id`, `ticket_id`, `estado`, `total`, `fecha`, `created_at`, `updated_at`) VALUES (1,1,'Aprobada',25.00,'2026-09-02 09:00:00','2026-09-02 09:00:00','2026-09-02 15:20:00'),(2,2,'Aprobada',45.00,'2026-09-07 09:15:00','2026-09-07 09:15:00','2026-09-09 10:40:00'),(3,3,'Rechazada',85.00,'2026-09-06 09:00:00','2026-09-06 09:00:00','2026-09-07 10:05:00'),(4,4,'Aprobada',45.00,'2026-09-09 08:30:00','2026-09-09 08:30:00','2026-09-09 12:00:00'),(5,5,'Pendiente',60.00,'2026-09-12 08:45:00','2026-09-12 08:45:00','2026-09-12 08:45:00');
/*!40000 ALTER TABLE `cotizaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `equipos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int(10) unsigned NOT NULL,
  `tipo` enum('Laptop','Computadora de escritorio','Impresora','Otro') NOT NULL,
  `marca` varchar(60) NOT NULL,
  `modelo` varchar(80) NOT NULL,
  `numero_serie` varchar(80) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_equipos_numero_serie` (`numero_serie`),
  KEY `cliente_id` (`cliente_id`),
  CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` (`id`, `cliente_id`, `tipo`, `marca`, `modelo`, `numero_serie`, `created_at`, `updated_at`) VALUES (1,1,'Laptop','Dell','Inspiron 15','DL-88291','2026-08-28 09:00:00','2026-08-28 09:00:00'),(2,2,'Computadora de escritorio','HP','Pavilion TP01','HP-55210','2026-08-28 09:00:00','2026-08-28 09:00:00'),(3,3,'Laptop','Lenovo','ThinkPad E14','LN-73104','2026-08-28 09:00:00','2026-08-28 09:00:00'),(4,3,'Impresora','Epson','L3250','EP-40218','2026-08-28 09:00:00','2026-08-28 09:00:00');
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `folio_contadores`
--

DROP TABLE IF EXISTS `folio_contadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `folio_contadores` (
  `anio` smallint(5) unsigned NOT NULL,
  `ultimo` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folio_contadores`
--

LOCK TABLES `folio_contadores` WRITE;
/*!40000 ALTER TABLE `folio_contadores` DISABLE KEYS */;
INSERT INTO `folio_contadores` (`anio`, `ultimo`) VALUES (2026,42);
/*!40000 ALTER TABLE `folio_contadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notificaciones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `usuario_id` int(10) unsigned NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `idx_notificaciones_usuario_leida` (`usuario_id`,`leida`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` (`id`, `ticket_id`, `usuario_id`, `mensaje`, `leida`, `fecha`, `created_at`, `updated_at`) VALUES (1,1,2,'El cliente aprobó la cotización del ticket TT-2026-0035.',1,'2026-09-02 15:20:00','2026-09-02 15:20:00','2026-09-02 15:20:00'),(2,2,3,'El cliente aprobó la cotización del ticket TT-2026-0037.',1,'2026-09-09 10:40:00','2026-09-09 10:40:00','2026-09-09 10:40:00'),(3,3,3,'El cliente rechazó la cotización del ticket TT-2026-0038.',0,'2026-09-07 10:05:00','2026-09-07 10:05:00','2026-09-07 10:05:00'),(4,4,3,'El cliente aprobó la cotización del ticket TT-2026-0039.',1,'2026-09-09 12:00:00','2026-09-09 12:00:00','2026-09-09 12:00:00');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequelize_data`
--

DROP TABLE IF EXISTS `sequelize_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sequelize_data` (
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequelize_data`
--

LOCK TABLES `sequelize_data` WRITE;
/*!40000 ALTER TABLE `sequelize_data` DISABLE KEYS */;
INSERT INTO `sequelize_data` (`name`) VALUES ('20261018000101-usuarios.js'),('20261018000102-clientes-equipos.js'),('20261018000103-catalogo.js'),('20261018000104-tickets.js'),('20261018000105-cotizaciones.js');
/*!40000 ALTER TABLE `sequelize_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequelize_meta`
--

DROP TABLE IF EXISTS `sequelize_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sequelize_meta` (
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequelize_meta`
--

LOCK TABLES `sequelize_meta` WRITE;
/*!40000 ALTER TABLE `sequelize_meta` DISABLE KEYS */;
INSERT INTO `sequelize_meta` (`name`) VALUES ('20261018000001-crear-usuarios.js'),('20261018000002-crear-clientes.js'),('20261018000003-crear-equipos.js'),('20261018000004-crear-catalogo-items.js'),('20261018000005-crear-tickets.js'),('20261018000006-crear-ticket-fotos.js'),('20261018000007-crear-ticket-historiales.js'),('20261018000008-crear-cotizaciones.js'),('20261018000009-crear-cotizacion-items.js'),('20261018000010-crear-notificaciones.js'),('20261018000011-crear-sesiones.js'),('20261019000012-agregar-fecha-estimada-tickets.js'),('20261019000013-agregar-comentario-historial.js'),('20261019000014-crear-folio-contadores.js');
/*!40000 ALTER TABLE `sequelize_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesiones`
--

DROP TABLE IF EXISTS `sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sesiones` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(10) unsigned NOT NULL,
  `data` mediumtext DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_sesiones_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones`
--

LOCK TABLES `sesiones` WRITE;
/*!40000 ALTER TABLE `sesiones` DISABLE KEYS */;
/*!40000 ALTER TABLE `sesiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_fotos`
--

DROP TABLE IF EXISTS `ticket_fotos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_fotos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `url_foto` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  CONSTRAINT `ticket_fotos_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_fotos`
--

LOCK TABLES `ticket_fotos` WRITE;
/*!40000 ALTER TABLE `ticket_fotos` DISABLE KEYS */;
INSERT INTO `ticket_fotos` (`id`, `ticket_id`, `url_foto`, `created_at`, `updated_at`) VALUES (1,1,'/img/equipo-placeholder-1.svg','2026-09-01 08:30:00','2026-09-01 08:30:00'),(2,2,'/img/equipo-placeholder-1.svg','2026-09-05 10:00:00','2026-09-05 10:00:00'),(3,2,'/img/equipo-placeholder-2.svg','2026-09-05 10:00:00','2026-09-05 10:00:00'),(4,3,'/img/equipo-placeholder-2.svg','2026-09-05 11:30:00','2026-09-05 11:30:00'),(5,4,'/img/equipo-placeholder-1.svg','2026-09-08 09:00:00','2026-09-08 09:00:00'),(6,5,'/img/equipo-placeholder-2.svg','2026-09-10 10:30:00','2026-09-10 10:30:00'),(7,6,'/img/equipo-placeholder-1.svg','2026-09-11 09:45:00','2026-09-11 09:45:00'),(8,6,'/img/equipo-placeholder-2.svg','2026-09-11 09:45:00','2026-09-11 09:45:00'),(9,7,'/img/equipo-placeholder-2.svg','2026-09-12 16:10:00','2026-09-12 16:10:00');
/*!40000 ALTER TABLE `ticket_fotos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_historiales`
--

DROP TABLE IF EXISTS `ticket_historiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_historiales` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `estado_anterior` enum('Recibido','Diagnosticado','Esperando_aprobacion','En_reparacion','Esperando_repuesto','Listo','Entregado','Cancelado') DEFAULT NULL,
  `estado_nuevo` enum('Recibido','Diagnosticado','Esperando_aprobacion','En_reparacion','Esperando_repuesto','Listo','Entregado','Cancelado') NOT NULL,
  `usuario_id` int(10) unsigned DEFAULT NULL,
  `comentario` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_ticket_historiales_ticket_fecha` (`ticket_id`,`fecha`),
  KEY `idx_ticket_historiales_estado_fecha` (`estado_nuevo`,`fecha`),
  CONSTRAINT `ticket_historiales_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `ticket_historiales_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_historiales`
--

LOCK TABLES `ticket_historiales` WRITE;
/*!40000 ALTER TABLE `ticket_historiales` DISABLE KEYS */;
INSERT INTO `ticket_historiales` (`id`, `ticket_id`, `estado_anterior`, `estado_nuevo`, `usuario_id`, `comentario`, `fecha`, `created_at`, `updated_at`) VALUES (1,1,NULL,'Recibido',2,NULL,'2026-09-01 08:30:00','2026-09-01 08:30:00','2026-09-01 08:30:00'),(2,1,'Recibido','Diagnosticado',2,NULL,'2026-09-01 14:00:00','2026-09-01 14:00:00','2026-09-01 14:00:00'),(3,1,'Diagnosticado','Esperando_aprobacion',2,NULL,'2026-09-02 09:00:00','2026-09-02 09:00:00','2026-09-02 09:00:00'),(4,1,'Esperando_aprobacion','En_reparacion',NULL,NULL,'2026-09-02 15:20:00','2026-09-02 15:20:00','2026-09-02 15:20:00'),(5,1,'En_reparacion','Listo',2,NULL,'2026-09-04 11:00:00','2026-09-04 11:00:00','2026-09-04 11:00:00'),(6,1,'Listo','Entregado',2,NULL,'2026-09-05 16:00:00','2026-09-05 16:00:00','2026-09-05 16:00:00'),(7,2,NULL,'Recibido',3,NULL,'2026-09-05 10:00:00','2026-09-05 10:00:00','2026-09-05 10:00:00'),(8,2,'Recibido','Diagnosticado',3,NULL,'2026-09-06 11:30:00','2026-09-06 11:30:00','2026-09-06 11:30:00'),(9,2,'Diagnosticado','Esperando_aprobacion',3,NULL,'2026-09-07 09:15:00','2026-09-07 09:15:00','2026-09-07 09:15:00'),(10,2,'Esperando_aprobacion','En_reparacion',NULL,NULL,'2026-09-09 10:40:00','2026-09-09 10:40:00','2026-09-09 10:40:00'),(11,3,NULL,'Recibido',3,NULL,'2026-09-05 11:30:00','2026-09-05 11:30:00','2026-09-05 11:30:00'),(12,3,'Recibido','Diagnosticado',3,NULL,'2026-09-05 16:00:00','2026-09-05 16:00:00','2026-09-05 16:00:00'),(13,3,'Diagnosticado','Esperando_aprobacion',3,NULL,'2026-09-06 09:00:00','2026-09-06 09:00:00','2026-09-06 09:00:00'),(14,3,'Esperando_aprobacion','Cancelado',NULL,NULL,'2026-09-07 10:05:00','2026-09-07 10:05:00','2026-09-07 10:05:00'),(15,4,NULL,'Recibido',3,NULL,'2026-09-08 09:00:00','2026-09-08 09:00:00','2026-09-08 09:00:00'),(16,4,'Recibido','Diagnosticado',3,NULL,'2026-09-08 15:00:00','2026-09-08 15:00:00','2026-09-08 15:00:00'),(17,4,'Diagnosticado','Esperando_aprobacion',3,NULL,'2026-09-09 08:30:00','2026-09-09 08:30:00','2026-09-09 08:30:00'),(18,4,'Esperando_aprobacion','En_reparacion',NULL,NULL,'2026-09-09 12:00:00','2026-09-09 12:00:00','2026-09-09 12:00:00'),(19,4,'En_reparacion','Esperando_repuesto',3,NULL,'2026-09-09 14:00:00','2026-09-09 14:00:00','2026-09-09 14:00:00'),(20,4,'Esperando_repuesto','En_reparacion',3,NULL,'2026-09-10 10:00:00','2026-09-10 10:00:00','2026-09-10 10:00:00'),(21,4,'En_reparacion','Listo',3,NULL,'2026-09-11 17:00:00','2026-09-11 17:00:00','2026-09-11 17:00:00'),(22,5,NULL,'Recibido',2,NULL,'2026-09-10 10:30:00','2026-09-10 10:30:00','2026-09-10 10:30:00'),(23,5,'Recibido','Diagnosticado',2,NULL,'2026-09-11 09:00:00','2026-09-11 09:00:00','2026-09-11 09:00:00'),(24,5,'Diagnosticado','Esperando_aprobacion',2,NULL,'2026-09-12 08:45:00','2026-09-12 08:45:00','2026-09-12 08:45:00'),(25,6,NULL,'Recibido',2,NULL,'2026-09-11 09:45:00','2026-09-11 09:45:00','2026-09-11 09:45:00'),(26,6,'Recibido','Diagnosticado',2,NULL,'2026-09-12 10:20:00','2026-09-12 10:20:00','2026-09-12 10:20:00'),(27,7,NULL,'Recibido',1,NULL,'2026-09-12 16:10:00','2026-09-12 16:10:00','2026-09-12 16:10:00');
/*!40000 ALTER TABLE `ticket_historiales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `folio` varchar(20) NOT NULL,
  `equipo_id` int(10) unsigned NOT NULL,
  `tecnico_id` int(10) unsigned DEFAULT NULL,
  `estado` enum('Recibido','Diagnosticado','Esperando_aprobacion','En_reparacion','Esperando_repuesto','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Recibido',
  `diagnostico_inicial` text NOT NULL,
  `fecha_ingreso` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_estimada` date DEFAULT NULL,
  `fecha_entrega` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tickets_folio` (`folio`),
  KEY `equipo_id` (`equipo_id`),
  KEY `idx_tickets_estado` (`estado`),
  KEY `idx_tickets_tecnico_estado` (`tecnico_id`,`estado`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_tickets_folio` CHECK (`folio` regexp '^TT-[0-9]{4}-[0-9]{4,}$'),
  CONSTRAINT `chk_tickets_fechas` CHECK (`fecha_entrega` is null or `fecha_entrega` >= `fecha_ingreso`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
INSERT INTO `tickets` (`id`, `folio`, `equipo_id`, `tecnico_id`, `estado`, `diagnostico_inicial`, `fecha_ingreso`, `fecha_estimada`, `fecha_entrega`, `created_at`, `updated_at`) VALUES (1,'TT-2026-0035',1,2,'Entregado','El equipo se sobrecalienta y el ventilador hace mucho ruido; se apaga solo tras 20 minutos de uso.','2026-09-01 08:30:00','2026-09-05','2026-09-05 16:00:00','2026-09-01 08:30:00','2026-09-05 16:00:00'),(2,'TT-2026-0037',4,3,'En_reparacion','Imprime con franjas horizontales y no reconoce el cartucho negro.','2026-09-05 10:00:00','2026-09-14',NULL,'2026-09-05 10:00:00','2026-09-09 10:40:00'),(3,'TT-2026-0038',2,3,'Cancelado','Muy lento al iniciar; el disco duro hace ruido de golpeteo.','2026-09-05 11:30:00',NULL,NULL,'2026-09-05 11:30:00','2026-09-07 10:05:00'),(4,'TT-2026-0039',1,3,'Listo','Se reinicia sola al abrir varios programas a la vez; posible falla de memoria RAM.','2026-09-08 09:00:00','2026-09-12',NULL,'2026-09-08 09:00:00','2026-09-11 17:00:00'),(5,'TT-2026-0040',3,2,'Esperando_aprobacion','Se calienta en exceso y funciona lento; el cliente solicita ampliar la memoria.','2026-09-10 10:30:00','2026-09-18',NULL,'2026-09-10 10:30:00','2026-09-12 08:45:00'),(6,'TT-2026-0041',2,2,'Diagnosticado','No arranca el sistema operativo; muestra pantalla azul al iniciar.','2026-09-11 09:45:00','2026-09-19',NULL,'2026-09-11 09:45:00','2026-09-12 10:20:00'),(7,'TT-2026-0042',1,NULL,'Recibido','La batería no carga y algunas teclas del teclado no responden.','2026-09-12 16:10:00','2026-09-20',NULL,'2026-09-12 16:10:00','2026-09-12 16:10:00');
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin','tecnico') NOT NULL DEFAULT 'tecnico',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  KEY `idx_usuarios_rol_activo` (`rol`,`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `password_hash`, `rol`, `activo`, `created_at`, `updated_at`) VALUES (1,'Administrador Principal','admin@tecnitrack.com','$2b$10$wTHM/q23lRZ7P2LbEtrY9ekGCRV0GyC5bC39ezDacdAdbR8kpvU5S','admin',1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(2,'Luis Fernández','luis.fernandez@tecnitrack.com','$2b$10$ora/trqt2ocNqvDW1dRt.uarWs5z6lWfYkyqNTTKvLNij2L7vXuNS','tecnico',1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(3,'Jorge Pineda','jorge.pineda@tecnitrack.com','$2b$10$8NCa9CYIbAglcTEiMaV.felnITTuQ5fm87dYOciDGFrhJUPCNjqja','tecnico',1,'2026-08-25 08:00:00','2026-08-25 08:00:00'),(4,'Óscar Meléndez','oscar.melendez@tecnitrack.com','$2b$10$i11p64TAh2W3dmKM5VDsKO6Me/FohQE.krGy7a/9FiPTT59cvlhSC','tecnico',0,'2026-08-25 08:00:00','2026-08-25 08:00:00');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'tecnitrack'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
